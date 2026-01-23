import httpx
from datetime import datetime, timezone
from typing import List
from .base import BaseCrawler
from ..models import Article
from loguru import logger

class HackerNewsCrawler(BaseCrawler):
    """Hacker News 爬蟲"""
    
    BASE_URL = "https://hacker-news.firebaseio.com/v0"

    async def fetch(self) -> List[Article]:
        max_items = self.config.params.get("max_items", 10)
        
        logger.debug(f"🔍 請求 Hacker News Top Stories (前 {max_items} 則)")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. 獲取熱門文章 ID 列表
                response = await client.get(f"{self.BASE_URL}/topstories.json")
                if response.status_code != 200:
                    logger.error(f"❌ HN API 回傳錯誤: {response.status_code}")
                    return []
                
                story_ids = response.json()[:max_items]
                logger.debug(f"✅ 獲得 {len(story_ids)} 則熱門文章 ID")
                
                # 2. 逐一獲取文章詳情
                articles = []
                for story_id in story_ids:
                    try:
                        item_resp = await client.get(f"{self.BASE_URL}/item/{story_id}.json")
                        if item_resp.status_code != 200:
                            continue
                        
                        item = item_resp.json()
                        if not item or item.get("type") != "story":
                            continue
                        
                        # 解析時間 (Unix timestamp)
                        ts = item.get("time", 0)
                        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                        
                        article = Article(
                            id=f"hn-{story_id}",
                            title=self.clean_text(item.get("title", "")),
                            authors=[item.get("by", "Unknown")],
                            summary=f"HN 熱門話題 (Score: {item.get('score', 0)}, Comments: {item.get('descendants', 0)})",
                            url=item.get("url", f"https://news.ycombinator.com/item?id={story_id}"),
                            source="hn",
                            published_date=dt
                        )
                        articles.append(article)
                    except Exception as e:
                        logger.warning(f"⚠️ 解析 HN 項目 {story_id} 失敗: {e}")
                        continue
                
                logger.debug(f"✅ 成功解析 {len(articles)} 則 HN 文章")
                return articles
            except Exception as e:
                logger.error(f"❌ 擷取 HN 資料失敗: {e}")
                return []
