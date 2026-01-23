import asyncio
from src.crawler.arxiv import ArxivCrawler
from src.crawler.github import GithubCrawler
from src.crawler.hackernews import HackerNewsCrawler
from src.scoring.engine import ScoringEngine
from src.refiner.engine import RefinerEngine
from src.database.storage import DatabaseManager
from src.models import SourceConfig
from loguru import logger

# 爬蟲類別映射
CRAWLER_MAP = {
    "arxiv": ArxivCrawler,
    "github": GithubCrawler,
    "hn": HackerNewsCrawler
}

async def main():
    logger.info("🚀 啟動 AI 資訊助理最終展示 ( Grand Finale )...")
    
    # 初始化資料庫
    db = DatabaseManager()
    processed_ids = db.get_processed_ids()
    logger.info(f"📊 目前資料庫中已有 {len(processed_ids)} 條記錄")

    # 1. 定義資訊源配置 (新增 HN)
    configs = [
        SourceConfig(name="arxiv", params={"query": "cat:cs.AI", "max_results": 5}),
        SourceConfig(name="github", params={"language": "python"}),
        SourceConfig(name="hn", params={"max_items": 10})
    ]
    
    # 2. 抓取並過濾
    raw_articles = []
    
    for config in configs:
        crawler_cls = CRAWLER_MAP.get(config.name)
        if not crawler_cls:
            continue
        crawler = crawler_cls(config)
        fetched = await crawler.fetch()
        new_items = [a for a in fetched if a.id not in processed_ids]
        raw_articles.extend(new_items)
        logger.info(f"📥 {config.name}: 獲得 {len(fetched)} 條，其中 {len(new_items)} 條為新內容")
    
    if not raw_articles:
        logger.success("✨ 沒有新的內容需要處理！")
        return

    # 3. 評分
    scoring_engine = ScoringEngine()
    scored_articles = scoring_engine.process_articles(raw_articles)
    
    # 4. 提煉 (分來源取樣，確保多樣性：每個來源最多 2 篇)
    from collections import defaultdict
    articles_by_source = defaultdict(list)
    for art in scored_articles:
        articles_by_source[art.source].append(art)
    
    to_refine = []
    for source, arts in articles_by_source.items():
        to_refine.extend(arts[:2])  # 每個來源取前 2 名
    
    refiner = RefinerEngine()
    refined_articles = await refiner.batch_refine(to_refine, top_n=len(to_refine))
    
    # 5. 保存結果
    db.save_articles(refined_articles)
    
    logger.info(f"✅ 展示本輪提煉的 Top {len(refined_articles)} 知識:")
    
    for i, art in enumerate(refined_articles):
        source_emoji = {"arxiv": "📄", "github": "🛠️", "hn": "🔥"}.get(art.source, "📌")
        logger.info(f"{source_emoji} [Top {i+1}] {art.title} (Score: {art.trust_score})")
        logger.info(f"   標籤: {', '.join(art.tags)}")
        logger.info(f"   💡 AI 摘要: {art.ai_summary}")
        logger.info("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
