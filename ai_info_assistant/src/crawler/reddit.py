"""
Reddit RSS 爬蟲
================
使用 Reddit 公開 RSS Feed 抓取 subreddit 熱門文章。
不需要 API 認證，使用 feedparser 解析 RSS。
"""

import feedparser
from datetime import datetime, timezone
from typing import List
from .base import BaseCrawler
from ..models import Article
from loguru import logger


class RedditCrawler(BaseCrawler):
    """Reddit RSS 爬蟲 - 從指定 subreddits 抓取熱門文章"""
    
    RSS_TEMPLATE = "https://www.reddit.com/r/{subreddit}/{sort}.rss"

    async def fetch(self) -> List[Article]:
        subreddits = self.config.params.get("subreddits", ["MachineLearning"])
        max_items = self.config.params.get("max_items", 10)
        sort = self.config.params.get("sort", "hot")  # hot, new, top
        
        logger.debug(f"🔍 請求 Reddit RSS ({len(subreddits)} subreddits, sort={sort})")
        
        articles = []
        items_per_sub = max(1, max_items // len(subreddits))
        
        for subreddit in subreddits:
            try:
                url = self.RSS_TEMPLATE.format(subreddit=subreddit, sort=sort)
                feed = feedparser.parse(url)
                
                if feed.bozo and not feed.entries:
                    logger.warning(f"⚠️ Reddit RSS 解析失敗: r/{subreddit}")
                    continue
                
                for entry in feed.entries[:items_per_sub]:
                    try:
                        # 解析發布時間
                        published = entry.get("published_parsed") or entry.get("updated_parsed")
                        if published:
                            dt = datetime(*published[:6], tzinfo=timezone.utc)
                        else:
                            dt = datetime.now(timezone.utc)
                        
                        # 從 entry.id 取得 Reddit post ID
                        entry_id = entry.get("id", entry.get("link", ""))
                        post_id = entry_id.split("/")[-2] if "/comments/" in entry_id else entry_id[-8:]
                        
                        article = Article(
                            id=f"reddit-{subreddit.lower()}-{post_id}",
                            title=self.clean_text(entry.get("title", "")),
                            authors=[entry.get("author", f"r/{subreddit}")],
                            summary=self._extract_summary(entry),
                            url=entry.get("link", ""),
                            source="reddit",
                            published_date=dt
                        )
                        articles.append(article)
                    except Exception as e:
                        logger.warning(f"⚠️ 解析 Reddit 項目失敗: {e}")
                        continue
                
                logger.debug(f"✅ r/{subreddit}: 取得 {min(len(feed.entries), items_per_sub)} 篇")
                
            except Exception as e:
                logger.error(f"❌ 抓取 r/{subreddit} 失敗: {e}")
                continue
        
        logger.debug(f"✅ Reddit 共取得 {len(articles)} 篇文章")
        return articles
    
    def _extract_summary(self, entry) -> str:
        """從 RSS entry 提取摘要"""
        # RSS content 通常包含 HTML，嘗試取得純文字
        summary = entry.get("summary", "")
        if not summary:
            content = entry.get("content", [])
            if content and isinstance(content, list):
                summary = content[0].get("value", "")
        
        # 簡單移除 HTML tags
        import re
        summary = re.sub(r'<[^>]+>', ' ', summary)
        summary = re.sub(r'\s+', ' ', summary).strip()
        
        # 限制長度
        if len(summary) > 500:
            summary = summary[:497] + "..."
        
        return summary if summary else "Reddit 討論文章"
