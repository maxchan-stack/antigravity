#!/usr/bin/env python3
"""
AI 資訊助理 - 定時排程腳本
==========================
自動定時執行資訊抓取、評分與提煉。

使用方式：
    uv run scheduler.py              # 使用 .env 中的間隔設定 (預設 2 小時)
    uv run scheduler.py --interval 60  # 每 60 分鐘執行一次
    uv run scheduler.py --once         # 只執行一次
"""

import asyncio
import argparse
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from src.crawler.arxiv import ArxivCrawler
from src.crawler.github import GithubCrawler
from src.crawler.hackernews import HackerNewsCrawler
from src.crawler.reddit import RedditCrawler
from src.scoring.engine import ScoringEngine
from src.scoring.relevance import RelevanceScorer
from src.refiner.engine import RefinerEngine
from src.database.storage import DatabaseManager
from src.models import SourceConfig
from src.config import config


CRAWLER_MAP = {
    "arxiv": ArxivCrawler,
    "github": GithubCrawler,
    "hn": HackerNewsCrawler,
    "reddit": RedditCrawler
}


async def run_pipeline():
    """執行完整的抓取-評分-提煉流程"""
    start_time = datetime.now()
    logger.info(f"🚀 [{start_time.strftime('%H:%M:%S')}] 開始執行資訊擷取流程...")
    
    # 初始化
    db = DatabaseManager()
    processed_ids = db.get_processed_ids()
    logger.info(f"📊 資料庫已有 {len(processed_ids)} 條記錄")

    # 1. 定義資訊源配置 (使用 config.py 的設定)
    configs = [
        SourceConfig(name="arxiv", params={"query": "cat:cs.AI OR cat:cs.LG", "max_results": config.arxiv_max_results}),
        SourceConfig(name="github", params={"language": config.github_language}),
        SourceConfig(name="hn", params={"max_items": config.hn_max_items}),
        SourceConfig(name="reddit", params={"subreddits": config.reddit_subreddits, "max_items": config.reddit_max_items})
    ]
    
    # 2. 抓取並過濾
    raw_articles = []
    for cfg in configs:
        crawler_cls = CRAWLER_MAP.get(cfg.name)
        if not crawler_cls:
            continue
        crawler = crawler_cls(cfg)
        fetched = await crawler.fetch()
        
        # 關鍵字過濾
        filtered = [a for a in fetched if config.matches_interests(a.title + " " + a.summary)]
        new_items = [a for a in filtered if a.id not in processed_ids]
        raw_articles.extend(new_items)
        logger.info(f"📥 {cfg.name}: 抓取 {len(fetched)} -> 關鍵字過濾 {len(filtered)} -> 新內容 {len(new_items)}")
    
    if not raw_articles:
        logger.success("✨ 沒有新的相關內容！")
        return

    # 3. 傳統評分
    scoring_engine = ScoringEngine()
    scored_articles = scoring_engine.process_articles(raw_articles)
    
    # 4. LLM 二階段相關性評分 (只處理前 10 名)
    relevance_scorer = RelevanceScorer()
    top_candidates = scored_articles[:10]
    relevance_results = await relevance_scorer.score_batch(top_candidates)
    relevant_articles = relevance_scorer.filter_relevant(relevance_results)
    
    if not relevant_articles:
        logger.info("⚠️ 沒有文章通過相關性評分")
        return

    # 5. 深度提煉
    refiner = RefinerEngine()
    refined_articles = await refiner.batch_refine(relevant_articles, top_n=len(relevant_articles))
    
    # 6. 保存
    db.save_articles(refined_articles)
    
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.success(f"🎉 流程完成！提煉 {len(refined_articles)} 篇，耗時 {elapsed:.1f}s")


def main():
    parser = argparse.ArgumentParser(description="AI 資訊助理定時排程")
    parser.add_argument("--interval", type=int, default=config.schedule_interval_mins, help="執行間隔 (分鐘)")
    parser.add_argument("--once", action="store_true", help="只執行一次")
    args = parser.parse_args()
    
    if args.once:
        logger.info("🔄 單次執行模式")
        asyncio.run(run_pipeline())
        return
    
async def start_scheduler(interval_mins: int):
    """啟動非同步排程器"""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_pipeline,
        trigger=IntervalTrigger(minutes=interval_mins),
        id="info_pipeline",
        name="資訊擷取流程",
        next_run_time=datetime.now()  # 立即執行一次
    )
    
    scheduler.start()
    logger.info(f"⏰ 啟動定時排程，每 {interval_mins} 分鐘執行一次")
    logger.info("   按 Ctrl+C 停止")
    
    try:
        while True:
            await asyncio.sleep(3600)  # 保持循環運行
    except (KeyboardInterrupt, SystemExit):
        logger.info("👋 排程已停止")
        scheduler.shutdown()


def main():
    parser = argparse.ArgumentParser(description="AI 資訊助理定時排程")
    parser.add_argument("--interval", type=int, default=config.schedule_interval_mins, help="執行間隔 (分鐘)")
    parser.add_argument("--once", action="store_true", help="只執行一次")
    args = parser.parse_args()
    
    if args.once:
        logger.info("🔄 單次執行模式")
        asyncio.run(run_pipeline())
        return
    
    try:
        asyncio.run(start_scheduler(args.interval))
    except (KeyboardInterrupt, SystemExit):
        pass


if __name__ == "__main__":
    main()
