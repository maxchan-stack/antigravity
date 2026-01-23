from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class Article(BaseModel):
    """核心文章資料模型"""
    id: str = Field(..., description="唯一識別碼 (例如 ArXiv ID 或 URL)")
    title: str = Field(..., description="文章標題")
    authors: List[str] = Field(default_factory=list, description="作者列表")
    summary: str = Field(..., description="原始摘要或描述")
    content: Optional[str] = Field(None, description="完整內容 (可選)")
    url: str = Field(..., description="原始連結")
    source: str = Field(..., description="來源 (例如 'arxiv', 'github', 'hn')")
    published_date: datetime = Field(..., description="發布日期")
    
    # 評分與提煉相關 (由後續模組填充)
    trust_score: float = Field(0.0, description="信用評分 (0.0 - 100.0)")
    tags: List[str] = Field(default_factory=list, description="主題標籤")
    ai_summary: Optional[str] = Field(None, description="AI 提煉的摘要")

class SourceConfig(BaseModel):
    """資訊源配置"""
    name: str
    enabled: bool = True
    update_interval_hours: int = 24
    params: dict = Field(default_factory=dict)
