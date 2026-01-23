import feedparser
import httpx
from datetime import datetime
from typing import List
from .base import BaseCrawler
from ..models import Article

class ArxivCrawler(BaseCrawler):
    """ArXiv 論文爬蟲"""
    
    API_URL = "https://export.arxiv.org/api/query"

    async def fetch(self) -> List[Article]:
        query = self.config.params.get("query", "cat:cs.AI")
        max_results = self.config.params.get("max_results", 10)
        
        params = {
            "search_query": query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }
        
        from loguru import logger
        logger.debug(f"🔍 請求 ArXiv API: {params}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(self.API_URL, params=params)
                if response.status_code != 200:
                    logger.error(f"❌ ArXiv API 回傳錯誤: {response.status_code}")
                    return []
                
                feed = feedparser.parse(response.text)
                logger.debug(f"✅ 成功解析 Feed, 共有 {len(feed.entries)} 條項目")
                
                articles = []
                for entry in feed.entries:
                    try:
                        # 解析發布時間
                        ts = entry.published.replace("Z", "+00:00")
                        dt = datetime.fromisoformat(ts)
                        
                        article = Article(
                            id=entry.id.split("/")[-1],
                            title=self.clean_text(entry.title),
                            authors=[a.name for a in entry.authors],
                            summary=self.clean_text(entry.summary),
                            url=entry.link,
                            source="arxiv",
                            published_date=dt
                        )
                        articles.append(article)
                    except Exception as e:
                        logger.warning(f"⚠️ 解析單條項目失敗: {e}")
                        continue
                        
                return articles
            except Exception as e:
                logger.error(f"❌ 擷取 ArXiv 資料失敗: {e}")
                return []
