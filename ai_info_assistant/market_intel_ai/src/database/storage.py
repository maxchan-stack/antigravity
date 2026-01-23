import sqlite3
import json
from datetime import datetime
from typing import List, Set
from ..models import Article
from loguru import logger

class DatabaseManager:
    """SQLite 資料庫管理器"""
    
    def __init__(self, db_path: str = "data/market.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """初始化資料表"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    authors TEXT,
                    summary TEXT,
                    ai_summary TEXT,
                    tags TEXT,
                    url TEXT,
                    source TEXT,
                    published_date TEXT,
                    trust_score REAL,
                    processed_at TEXT,
                    
                    -- Financial Fields
                    sentiment TEXT,
                    market_impact_score INTEGER,
                    key_risks TEXT
                )
            """)
            # 嘗試新增欄位（如果不存在）
            try:
                cursor.execute("ALTER TABLE articles ADD COLUMN rlm_analysis TEXT")
            except sqlite3.OperationalError:
                pass  # 欄位已存在
            conn.commit()

    def get_processed_ids(self) -> Set[str]:
        """獲取所有已處理過的文章 ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM articles")
            return {row[0] for row in cursor.fetchall()}

    def save_articles(self, articles: List[Article]):
        """批量保存文章"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for art in articles:
                cursor.execute("""
                    INSERT OR REPLACE INTO articles 
                    (id, title, authors, summary, ai_summary, tags, url, source, published_date, trust_score, processed_at, sentiment, market_impact_score, key_risks)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    art.id,
                    art.title,
                    ",".join(art.authors),
                    art.summary,
                    art.ai_summary,
                    json.dumps(art.tags),
                    art.url,
                    art.source,
                    art.published_date.isoformat(),
                    art.trust_score,
                    datetime.now().isoformat(),
                    art.sentiment,
                    art.market_impact_score,
                    json.dumps(art.key_risks)
                ))
            conn.commit()
            logger.info(f"💾 成功保存 {len(articles)} 篇文章到資料庫")

    def delete_article(self, article_id: str):
        """刪除指定文章"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM articles WHERE id = ?", (article_id,))
            conn.commit()
            logger.info(f"🗑️ 已從資料庫刪除文章: {article_id}")
