import asyncio
import feedparser
import httpx
from typing import List
from datetime import datetime
from email.utils import parsedate_to_datetime
from loguru import logger
from .base import BaseCrawler
from ..models import Article, SourceConfig

class FinancialCrawler(BaseCrawler):
    """財經新聞爬蟲 (Google Finance RSS)"""
    
    BASE_URL = "https://news.google.com/rss/search"

    async def fetch(self) -> List[Article]:
        tickers = self.config.params.get("tickers", [])
        if not tickers:
            logger.warning("未設定股票代號")
            return []

        all_articles = []
        for ticker in tickers:
            articles = await self._fetch_ticker(ticker)
            all_articles.extend(articles)
        
        return all_articles

    async def _fetch_ticker(self, ticker: str) -> List[Article]:
        params = {
            "q": f"{ticker} stock",
            "hl": "en-US",
            "gl": "US",
            "ceid": "US:en"
        }
        
        try:
            logger.info(f"🔍 正在抓取 {ticker} 的財經新聞...")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.BASE_URL, params=params)
                response.raise_for_status()
                
            feed = feedparser.parse(response.content)
            articles = []
            
            for entry in feed.entries[:5]:  # 每個代號只取前 5 則
                try:
                    pub_date = datetime.now()
                    if hasattr(entry, "published"):
                        pub_date = parsedate_to_datetime(entry.published)
                        
                    article = Article(
                        id=entry.link,
                        title=f"[{ticker}] {entry.title}",
                        authors=[entry.source.title] if hasattr(entry, "source") else [],
                        summary=entry.description if hasattr(entry, "description") else "",
                        url=entry.link,
                        source="finance",
                        published_date=pub_date,
                        trust_score=0.0,  # 待 AI 評分
                        tags=[ticker, "Stock"]
                    )
                    articles.append(article)
                except Exception as e:
                    logger.warning(f"解析新聞條目失敗: {e}")
                    continue
                    
            logger.success(f"✅ {ticker}: 取得 {len(articles)} 則新聞")
            return articles
            
        except Exception as e:
            logger.error(f"❌ 抓取 {ticker} 失敗: {e}")
            return []
