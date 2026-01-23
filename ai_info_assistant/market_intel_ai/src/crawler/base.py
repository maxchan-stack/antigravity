import abc
from typing import List
from ..models import Article, SourceConfig

class BaseCrawler(abc.ABC):
    """爬蟲基底類別"""
    
    def __init__(self, config: SourceConfig):
        self.config = config

    @abc.abstractmethod
    async def fetch(self) -> List[Article]:
        """抓取最新的文章列表"""
        pass

    def clean_text(self, text: str) -> str:
        """基礎文字清洗"""
        if not text:
            return ""
        return text.strip().replace("\n", " ")
