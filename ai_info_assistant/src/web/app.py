import sqlite3
import json
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

app = FastAPI(title="AI 資訊助理 Web UI")

# 專案根目錄 (向上兩層：src/web -> src -> 專案根)
PROJECT_ROOT = Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

DB_PATH = PROJECT_ROOT / "data" / "assistant.db"


# 排序選項對應
SORT_OPTIONS = {
    "newest": ("processed_at", "DESC"),
    "score": ("trust_score", "DESC"),
    "published": ("published_date", "DESC")
}


def get_articles(limit: int = 50, source: str = None, sort: str = "newest"):
    """從資料庫讀取文章，支援來源篩選與排序"""
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT id, title, source, ai_summary, tags, url, trust_score, processed_at, published_date FROM articles"
        params = []
        
        if source and source != "all":
            query += " WHERE source = ?"
            params.append(source)
        
        # 排序
        sort_col, sort_dir = SORT_OPTIONS.get(sort, ("processed_at", "DESC"))
        query += f" ORDER BY {sort_col} {sort_dir} LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        articles = []
        for row in rows:
            articles.append({
                "id": row["id"],
                "title": row["title"],
                "source": row["source"],
                "ai_summary": row["ai_summary"] or "無摘要",
                "tags": json.loads(row["tags"]) if row["tags"] else [],
                "url": row["url"],
                "trust_score": row["trust_score"],
                "processed_at": row["processed_at"]
            })
        return articles


@app.get("/", response_class=HTMLResponse)
async def home(request: Request, source: str = "all", sort: str = "newest"):
    articles = get_articles(source=source, sort=sort)
    return templates.TemplateResponse("index.html", {
        "request": request,
        "articles": articles,
        "total_count": len(articles),
        "current_source": source,
        "current_sort": sort
    })


@app.get("/api/articles")
async def api_articles(limit: int = 30):
    return get_articles(limit)


@app.delete("/api/articles/{article_id:path}")
async def delete_article(article_id: str):
    from src.database.storage import DatabaseManager
    db = DatabaseManager()
    db.delete_article(article_id)
    return {"status": "success", "message": f"Article {article_id} deleted"}


@app.post("/api/articles/{article_id:path}/analyze")
async def analyze_article(article_id: str, background_tasks: BackgroundTasks):
    """啟動 RLM 深度分析任務 (背景執行)"""
    from src.database.storage import DatabaseManager
    
    # 獲取文章資訊
    db = DatabaseManager()
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT title, summary, url FROM articles WHERE id = ?", (article_id,))
        row = cursor.fetchone()
        if not row:
            return {"status": "error", "message": "Article not found"}
    
    # 背景執行分析任務
    async def run_analysis():
        try:
            from src.refiner.rlm_analyzer import get_analyzer
            analyzer = get_analyzer()
            result = await analyzer.analyze(row["title"], row["summary"] or "", row["url"])
            
            # 儲存結果
            with sqlite3.connect(str(DB_PATH)) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE articles SET rlm_analysis = ? WHERE id = ?", (result, article_id))
                conn.commit()
        except Exception as e:
            import traceback
            traceback.print_exc()
    
    background_tasks.add_task(run_analysis)
    return {"status": "started", "message": "Analysis started in background"}


@app.get("/api/articles/{article_id:path}/analysis")
async def get_analysis(article_id: str):
    """獲取文章的 RLM 分析結果"""
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT rlm_analysis FROM articles WHERE id = ?", (article_id,))
        row = cursor.fetchone()
        if not row:
            return {"status": "error", "message": "Article not found"}
        return {"status": "success", "analysis": row["rlm_analysis"]}

