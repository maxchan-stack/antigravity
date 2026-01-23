#!/usr/bin/env python3
"""
Market Intel AI - 排程腳本
==========================
負責協調：
1. FinancialCrawler (抓取 Google Finance RSS)
2. MarketSentimentAnalyzer (Gemini 情緒分析)
3. DatabaseManager (儲存)
"""

import asyncio
import argparse
from datetime import datetime
from loguru import logger
import os
from dotenv import load_dotenv

# 確保載入 .env
load_dotenv()

from src.crawler.finance_crawler import FinancialCrawler
from src.analyzer.sentiment_engine import MarketSentimentAnalyzer
from src.database.storage import DatabaseManager
from src.models import SourceConfig
from src.config import config

async def run_pipeline():
    """執行財經新聞分析流程"""
    start_time = datetime.now()
    logger.info(f"🚀 [Market Intel] 開始執行市場情報分析...")
    
    # 1. 抓取
    crawler = FinancialCrawler(SourceConfig(
        name="finance", 
        params={"tickers": config.stock_tickers}
    ))
    
    raw_articles = await crawler.fetch()
    if not raw_articles:
        logger.info("⚠️ 無新新聞")
        return

    # 2. 過濾已存在的
    db = DatabaseManager()
    processed_ids = db.get_processed_ids()
    new_articles = [a for a in raw_articles if a.id not in processed_ids]
    
    logger.info(f"📥 抓取 {len(raw_articles)} -> 新增 {len(new_articles)}")
    
    if not new_articles:
        return

    # 3. AI 情緒分析
    analyzer = MarketSentimentAnalyzer()
    analyzed_articles = await analyzer.batch_analyze(new_articles)
    
    # 4. 存檔
    db.save_articles(analyzed_articles)
    
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.success(f"🎉 流程完成！分析了 {len(analyzed_articles)} 篇財經新聞，耗時 {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(run_pipeline())
