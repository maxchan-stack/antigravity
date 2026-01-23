import json
from typing import List
from ..models import Article
from .llm import LLMClient
from loguru import logger

class MarketSentimentAnalyzer:
    """市場情緒分析引擎 (AI Analyst)"""
    
    def __init__(self):
        self.llm = LLMClient()

    async def analyze(self, article: Article) -> Article:
        """使用 AI 分析新聞對股價的影響"""
        logger.info(f"🤖 正在分析市場情緒: {article.title}")
        
        system_prompt = """你是一位華爾街資深分析師，擅長解讀新聞對股價的影響。
請根據新聞內容進行專業評估。"""
        
        user_prompt = f"""請分析以下財經新聞對該公司已及市場的潛在影響：

---
標題: {article.title}
摘要: {article.summary}
---

請回傳 JSON 格式，包含以下欄位：
1. sentiment: "bullish" (看多), "bearish" (看空), 或 "neutral" (中性)
2. market_impact_score: 0-100 (分數越高代表對股價波動影響越大)
3. ai_summary: 一句話繁體中文短評 (例如：財報優於預期，但指引疲弱)
4. key_risks: 列出 1-3 個潛在風險點 (List[str])
5. tags: 3-5 個相關關鍵字 (例如：Earnings, AI, Chip War)

輸出範例：
{{
  "sentiment": "bullish",
  "market_impact_score": 85,
  "ai_summary": "...",
  "key_risks": ["..."],
  "tags": ["..."]
}}
"""
        
        response = await self.llm.chat_completion(system_prompt, user_prompt)
        
        if response:
            try:
                # 清理 Markdown 代碼區塊
                clean_json = response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:-3].strip()
                elif clean_json.startswith("```"):
                    clean_json = clean_json[3:-3].strip()
                
                data = json.loads(clean_json)
                
                # 更新文章欄位
                article.sentiment = data.get("sentiment", "neutral")
                article.market_impact_score = data.get("market_impact_score", 0)
                article.ai_summary = data.get("ai_summary", article.summary)
                article.key_risks = data.get("key_risks", [])
                article.tags = data.get("tags", article.tags)
                
                # 同步更新 Trust Score 以反映重要性
                article.trust_score = float(article.market_impact_score)
                
                logger.success(f"✅ 分析完成 [{article.sentiment.upper()}]: {article.title}")
                
            except Exception as e:
                logger.error(f"❌ 解析 AI 回應失敗: {e} | 原始回應: {response}")
        
        return article

    async def batch_analyze(self, articles: List[Article]) -> List[Article]:
        """批量分析"""
        results = []
        for art in articles:
            analyzed = await self.analyze(art)
            results.append(analyzed)
        return results
