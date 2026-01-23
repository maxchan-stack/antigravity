from typing import List, Optional
import json
from ..models import Article
from .llm import LLMClient
from loguru import logger

class RefinerEngine:
    """AI 知識提煉引擎 (正式版)"""
    
    def __init__(self):
        self.llm = LLMClient()

    async def refine(self, article: Article) -> Article:
        """使用 LLM 提煉文章知識"""
        logger.info(f"🤖 正在提煉文章: {article.title}")
        
        system_prompt = "你是一位專業的科技資訊助理，擅長從學術論文摘要中提煉核心價值。請以繁體中文回應。"
        
        user_prompt = f"""請分析以下文章並提供：
1. 一句話核心價值 (ai_summary)
2. 3-5 個關鍵主題標籤 (tags)

---
標題: {article.title}
作者: {', '.join(article.authors)}
原始摘要: {article.summary}
---

請以 JSON 格式回傳，格式如下：
{{
  "ai_summary": "...",
  "tags": ["...", "..."]
}}
"""
        
        response = await self.llm.chat_completion(system_prompt, user_prompt)
        if response:
            try:
                # 簡單清理可能的 Markdown 標籤
                clean_json = response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:-3].strip()
                elif clean_json.startswith("```"):
                    clean_json = clean_json[3:-3].strip()
                
                data = json.loads(clean_json)
                article.ai_summary = data.get("ai_summary", article.ai_summary)
                article.tags = data.get("tags", article.tags)
                logger.success(f"✅ 提煉完成: {article.title}")
            except Exception as e:
                logger.error(f"❌ 解析 LLM 回傳 JSON 失敗: {e} | 原始回應: {response}")
        
        return article

    async def batch_refine(self, articles: List[Article], top_n: int = 3) -> List[Article]:
        """批量處理高得分文章"""
        refined_articles = []
        for art in articles[:top_n]:
            refined = await self.refine(art)
            refined_articles.append(refined)
        return refined_articles
