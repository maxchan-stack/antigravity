from datetime import datetime, timezone
from typing import List
from ..models import Article

class ScoringEngine:
    """信任度評分引擎"""
    
    SOURCE_WEIGHTS = {
        "arxiv": 0.9,
        "github": 0.7,
        "hn": 0.6,
        "twitter": 0.3
    }

    def calculate_score(self, article: Article) -> float:
        """計算文章的信任度評分 (0-100)"""
        base_score = 50.0
        
        # 1. 來源權重 (佔 40%)
        source_weight = self.SOURCE_WEIGHTS.get(article.source, 0.4)
        source_score = source_weight * 40.0
        
        # 2. 新鮮度評分 (佔 30%)
        # 越近期的文章分數越高
        age_days = (datetime.now(timezone.utc) - article.published_date).days
        recency_score = max(0, 30.0 - (age_days * 2)) # 每多一天扣 2 分
        
        # 3. 作者權威性 (佔 30%) - 簡易啟發式：作者越多通常代表團隊研究
        author_score = min(30.0, len(article.authors) * 5.0)
        
        final_score = base_score * 0.2 + source_score + recency_score + author_score
        return round(min(100.0, final_score), 2)

    def process_articles(self, articles: List[Article]) -> List[Article]:
        """批量處理文章評分"""
        for article in articles:
            article.trust_score = self.calculate_score(article)
        return sorted(articles, key=lambda x: x.trust_score, reverse=True)
