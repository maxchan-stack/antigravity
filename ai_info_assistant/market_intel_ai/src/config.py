import os
from dataclasses import dataclass, field
from typing import List
from dotenv import load_dotenv

load_dotenv()


@dataclass
class AppConfig:
    """Market Intel AI 配置"""
    
    # API 設定
    api_base_url: str = field(default_factory=lambda: os.getenv("API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"))
    api_key: str = field(default_factory=lambda: os.getenv("API_KEY", ""))
    model_name: str = field(default_factory=lambda: os.getenv("MODEL_NAME", "gemini-2.5-flash"))
    
    # 監控股票代號
    stock_tickers: List[str] = field(default_factory=lambda: [
        t.strip().upper() for t in 
        os.getenv("STOCK_TICKERS", "TSLA,NVDA,AAPL,MSFT,AMD").split(",")
    ])
    
    # 抓取數量 (每個代號)
    news_per_ticker: int = field(default_factory=lambda: int(os.getenv("NEWS_PER_TICKER", "5")))
    
    # 排程間隔 (分鐘)
    schedule_interval_mins: int = field(default_factory=lambda: int(os.getenv("SCHEDULE_INTERVAL_MINS", "60")))
    
    # 市場情緒閾值 (0-100)
    # 分數越高代表對市場影響越大
    impact_threshold: int = field(default_factory=lambda: int(os.getenv("IMPACT_THRESHOLD", "50")))


# 全局配置實例
config = AppConfig()
