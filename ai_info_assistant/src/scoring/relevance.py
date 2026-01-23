from typing import List, Tuple
import json
from ..models import Article
from ..refiner.llm import LLMClient
from ..config import config
from loguru import logger


class RelevanceScorer:
    """LLM 二階段相關性評分器"""
    
    def __init__(self):
        self.llm = LLMClient()
        self.threshold = config.relevance_threshold

    async def score_batch(self, articles: List[Article]) -> List[Tuple[Article, int]]:
        """批量評估文章相關性 (0-100 分)"""
        results = []
        
        for art in articles:
            score = await self._score_single(art)
            results.append((art, score))
            
        return results

    async def _score_single(self, article: Article) -> int:
        """評估單篇文章的相關性"""
        interests = ", ".join(config.interest_keywords[:10])
        
        system_prompt = "你是一位專業的科技資訊篩選助理。請評估文章與用戶興趣的相關性。只輸出 JSON。"
        
        user_prompt = f"""用戶興趣領域：{interests}

文章資訊：
- 標題: {article.title}
- 來源: {article.source}
- 摘要: {article.summary[:500]}

請評估這篇文章與用戶興趣的相關性，給出 0-100 的分數：
- 90-100: 高度相關，用戶必須閱讀
- 70-89: 相關，值得推薦
- 50-69: 部分相關
- 0-49: 不太相關

只輸出 JSON 格式：{{"score": 分數, "reason": "簡短原因"}}"""

        try:
            response = await self.llm.chat_completion(system_prompt, user_prompt)
            if response:
                # 清理 JSON
                clean = response.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                data = json.loads(clean)
                score = int(data.get("score", 50))
                logger.debug(f"📊 [{article.source}] {article.title[:40]}... -> 相關性: {score}")
                return score
        except Exception as e:
            logger.warning(f"⚠️ 相關性評分失敗: {e}")
        
        return 50  # 預設中等相關

    def filter_relevant(self, scored_articles: List[Tuple[Article, int]]) -> List[Article]:
        """過濾出高相關性文章"""
        relevant = [art for art, score in scored_articles if score >= self.threshold]
        logger.info(f"✅ 相關性過濾: {len(scored_articles)} -> {len(relevant)} 篇 (閾值: {self.threshold})")
        return relevant
