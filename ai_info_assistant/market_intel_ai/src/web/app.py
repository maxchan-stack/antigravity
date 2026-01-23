import sqlite3
import json
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from ..config import config
from ..crawler.finance_crawler import FinancialCrawler
from ..analyzer.sentiment_engine import MarketSentimentAnalyzer
from ..database.storage import DatabaseManager
from ..models import SourceConfig
import asyncio

app = FastAPI(title="Market Intel AI")

# 路徑設定
PROJECT_ROOT = Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

DB_PATH = PROJECT_ROOT / "data" / "market.db"

async def fetch_and_analyze_ticker(ticker: str):
    """背景任務：抓取並分析新加入的 Ticker"""
    print(f"🚀 [Background] 開始抓取新標的: {ticker}")
    
    # 1. 抓取
    crawler = FinancialCrawler(SourceConfig(name="finance", params={"tickers": [ticker]}))
    raw_articles = await crawler.fetch()
    
    if not raw_articles:
        return

    # 2. 過濾
    db = DatabaseManager(str(DB_PATH))
    processed_ids = db.get_processed_ids()
    new_articles = [a for a in raw_articles if a.id not in processed_ids]
    
    if not new_articles:
        return

    # 3. 分析
    analyzer = MarketSentimentAnalyzer()
    analyzed_articles = await analyzer.batch_analyze(new_articles)
    
    # 4. 存檔
    db.save_articles(analyzed_articles)
    print(f"✅ [Background] 完成新標的分析: {ticker}")

@app.post("/api/tickers")
async def add_ticker(request: Request, background_tasks: BackgroundTasks):
    form = await request.form()
    new_ticker = form.get("ticker", "").strip().upper()
    
    if new_ticker and new_ticker not in config.stock_tickers:
        config.stock_tickers.append(new_ticker)
        # 觸發背景抓取
        background_tasks.add_task(fetch_and_analyze_ticker, new_ticker)
        
    return RedirectResponse(url=f"/?ticker={new_ticker}", status_code=303)

@app.delete("/api/tickers/{ticker}")
async def remove_ticker(ticker: str):
    """從監控清單中移除 Ticker"""
    ticker_upper = ticker.upper()
    if ticker_upper in config.stock_tickers:
        config.stock_tickers.remove(ticker_upper)
    return {"status": "ok", "removed": ticker_upper}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request, ticker: str = "all", sort: str = "score"):
    """首頁 Dashboard"""
    
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. 獲取所有監控的 Tickers
        tickers = config.stock_tickers
        
        # 2. 查詢文章
        query = """
            SELECT id, title, source, ai_summary, tags, url, 
                   sentiment, market_impact_score, key_risks, published_date 
            FROM articles 
        """
        params = []
        
        if ticker != "all":
            query += " WHERE title LIKE ?"
            params.append(f"%[{ticker}]%")
            
        # 排序邏輯
        if sort == "score":
            query += " ORDER BY market_impact_score DESC"
        else:
            query += " ORDER BY published_date DESC"
            
        query += " LIMIT 50"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        articles = []
        for row in rows:
            articles.append({
                "id": row["id"],
                "title": row["title"],
                "source": row["source"],
                "ai_summary": row["ai_summary"] or "等待分析...",
                "tags": json.loads(row["tags"]) if row["tags"] else [],
                "url": row["url"],
                "sentiment": row["sentiment"],
                "score": row["market_impact_score"],
                "key_risks": json.loads(row["key_risks"]) if row["key_risks"] else [],
                "published_date": row["published_date"]
            })

    return templates.TemplateResponse("index.html", {
        "request": request,
        "articles": articles,
        "tickers": tickers,
        "current_ticker": ticker,
        "current_sort": sort
    })
