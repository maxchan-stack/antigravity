import os
from dataclasses import dataclass, field
from typing import List
from dotenv import load_dotenv

load_dotenv()


@dataclass
class AppConfig:
    """應用程式配置"""
    
    # API 設定
    api_base_url: str = field(default_factory=lambda: os.getenv("API_BASE_URL", "http://localhost:3000/v1"))
    api_key: str = field(default_factory=lambda: os.getenv("API_KEY", "sk-antigravity-default"))
    model_name: str = field(default_factory=lambda: os.getenv("MODEL_NAME", "gemini-3-flash"))
    
    # 抓取數量
    arxiv_max_results: int = field(default_factory=lambda: int(os.getenv("ARXIV_MAX_RESULTS", "20")))
    hn_max_items: int = field(default_factory=lambda: int(os.getenv("HN_MAX_ITEMS", "30")))
    github_language: str = field(default_factory=lambda: os.getenv("GITHUB_LANGUAGE", "python"))
    
    # 興趣關鍵字
    interest_keywords: List[str] = field(default_factory=lambda: [
        kw.strip().lower() for kw in 
        os.getenv("INTEREST_KEYWORDS", "AI,LLM,Python").split(",")
    ])
    
    # 相關性閾值
    relevance_threshold: int = field(default_factory=lambda: int(os.getenv("RELEVANCE_THRESHOLD", "60")))
    
    # 排程間隔 (分鐘)
    schedule_interval_mins: int = field(default_factory=lambda: int(os.getenv("SCHEDULE_INTERVAL_MINS", "120")))
    
    # Reddit 設定
    reddit_subreddits: List[str] = field(default_factory=lambda: [
        s.strip() for s in 
        os.getenv("REDDIT_SUBREDDITS", "MachineLearning,LocalLLaMA,artificial").split(",")
    ])
    reddit_max_items: int = field(default_factory=lambda: int(os.getenv("REDDIT_MAX_ITEMS", "15")))

    def matches_interests(self, text: str) -> bool:
        """檢查文字是否符合興趣關鍵字"""
        text_lower = text.lower()
        return any(kw in text_lower for kw in self.interest_keywords)


# 全局配置實例
config = AppConfig()
