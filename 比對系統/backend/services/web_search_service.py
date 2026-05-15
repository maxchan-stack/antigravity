import logging
from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class WebSearchService:
    def __init__(self):
        self.ddgs = DDGS()

    def search_web(self, query: str, max_results: int = 5):
        """
        Search the web using DuckDuckGo (Google fallback blocked).
        Start with more results, then filter out 'zhihu.com'.
        """
        try:
            logger.info(f"Searching web for: {query}")
            
            # Request more results (e.g. 2x) to allow for filtering
            # region="wt-wt" (No region) or default.
            raw_results = list(self.ddgs.text(query, max_results=max_results * 2))
            
            filtered_results = []
            for res in raw_results:
                if len(filtered_results) >= max_results:
                    break
                
                # STRICT EXCLUSION: Skip Zhihu
                if "zhihu.com" in res['href']:
                    continue
                
                filtered_results.append(res)
                
            return filtered_results
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return []

    def crawl_url(self, url: str):
        """
        Fetch and extract text content from a URL.
        """
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove scripts and styles
            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.decompose()
                
            text = soup.get_text()
            
            # Break into lines and remove leading/trailing space
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            return text
        except Exception as e:
            logger.warning(f"Failed to crawl {url}: {e}")
            return ""

web_search_service = WebSearchService()
