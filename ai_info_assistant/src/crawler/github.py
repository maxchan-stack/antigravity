import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import List
from .base import BaseCrawler
from ..models import Article
from loguru import logger

class GithubCrawler(BaseCrawler):
    """GitHub Trending 爬蟲"""
    
    BASE_URL = "https://github.com/trending"

    async def fetch(self) -> List[Article]:
        language = self.config.params.get("language", "")
        url = f"{self.BASE_URL}/{language}" if language else self.BASE_URL
        
        logger.debug(f"🔍 請求 GitHub Trending: {url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if response.status_code != 200:
                    logger.error(f"❌ GitHub 回傳錯誤: {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, "html.parser")
                repo_list = soup.select("article.Box-row")
                logger.debug(f"✅ 成功解析 Trending, 共有 {len(repo_list)} 條項目")
                
                articles = []
                for repo in repo_list:
                    try:
                        title_tag = repo.select_one("h2 a")
                        title = title_tag.get_text(strip=True).replace(" / ", "/")
                        link = "https://github.com" + title_tag["href"]
                        
                        desc_tag = repo.select_one("p")
                        desc = desc_tag.get_text(strip=True) if desc_tag else "無描述"
                        
                        # 抓取星數 (簡化，作為新鮮度/權威性參考)
                        star_tag = repo.select_one("a[href$='/stargazers']")
                        stars = star_tag.get_text(strip=True) if star_tag else "0"
                        
                        article = Article(
                            id=f"github-{title}",
                            title=title,
                            authors=["GitHub Community"], # Trending 專案通常為團隊或社區
                            summary=f"GitHub 熱門專案: {desc} (Stars: {stars})",
                            url=link,
                            source="github",
                            published_date=datetime.now(timezone.utc) # Trending 代表當下熱門
                        )
                        articles.append(article)
                    except Exception as e:
                        logger.warning(f"⚠️ 解析 GitHub 項目失敗: {e}")
                        continue
                        
                return articles
            except Exception as e:
                logger.error(f"❌ 擷取 GitHub 資料失敗: {e}")
                return []
