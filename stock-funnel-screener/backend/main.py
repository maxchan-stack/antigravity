import os
import sys

# 修正匯入路徑，確保能找到同目錄下的模組
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_session, Stock, FinancialData, DailyPrice, init_db
from services.scraper import TaiwanStockScraper
from services.metrics import MetricsEngine
from services.ai_analyst import StockAIAnalyst
from pydantic import BaseModel
from typing import List, Optional

# 確保資料儲存目錄存在
data_dir = os.path.join(current_dir, "data")
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

app = FastAPI(title="AI Stock Screener API")

# 允許跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化資料庫
@app.on_event("startup")
def startup_event():
    if not os.path.exists("data"):
        os.makedirs("data")
    init_db()

class StockInfo(BaseModel):
    symbol: str
    name: str
    industry: str
    roic: Optional[float]
    fcf_yield: Optional[float]
    score: Optional[float] = 0.0

@app.get("/stocks", response_model=List[StockInfo])
def list_stocks(industry: Optional[str] = None):
    session = get_session()
    query = session.query(Stock)
    if industry:
        query = query.filter(Stock.industry == industry)
    
    stocks = query.all()
    result = []
    for s in stocks:
        fin = session.query(FinancialData).filter_by(stock_id=s.id).order_by(FinancialData.date.desc()).first()
        result.append(StockInfo(
            symbol=s.symbol,
            name=s.name,
            industry=s.industry or "未知",
            roic=fin.roic if fin else None,
            fcf_yield=(fin.fcf / fin.revenue) if (fin and fin.fcf is not None and fin.revenue) else None,
        ))
    session.close()
    return result

@app.get("/stocks/search/{symbol}", response_model=StockInfo)
def search_stock(symbol: str):
    session = get_session()
    # 支援 2330 或 2330.TW 格式
    if not symbol.endswith(".TW") and not symbol.endswith(".TWO"):
        # 預設嘗試上市 (.TW)
        stock = session.query(Stock).filter(Stock.symbol.like(f"{symbol}.%")).first()
    else:
        stock = session.query(Stock).filter_by(symbol=symbol).first()
        
    if not stock:
        session.close()
        raise HTTPException(status_code=404, detail="Stock not found. 如果是新股票請先執行市場同步。")
    
    fin = session.query(FinancialData).filter_by(stock_id=stock.id).order_by(FinancialData.date.desc()).first()
    result = StockInfo(
        symbol=stock.symbol,
        name=stock.name,
        industry=stock.industry or "未知",
        roic=fin.roic if fin else None,
        fcf_yield=(fin.fcf / fin.revenue) if (fin and fin.fcf is not None and fin.revenue) else None,
    )
    session.close()
    return result

@app.get("/stocks/{symbol}/analysis")
def get_analysis(symbol: str):
    session = get_session()
    stock = session.query(Stock).filter_by(symbol=symbol).first()
    if not stock:
        session.close()
        raise HTTPException(status_code=404, detail="Stock not found")
    
    fin = session.query(FinancialData).filter_by(stock_id=stock.id).order_by(FinancialData.date.desc()).first()
    if not fin:
        session.close()
        raise HTTPException(status_code=400, detail="No financial data available. 請先執行同步。")

    # 取得技術面摘要
    engine = MetricsEngine(session)
    tech_summary = engine.get_technical_summary(stock.id)
    
    # 計算籌碼加速度
    flow_acc = engine.calculate_institutional_acceleration(stock.id)

    # 準備指標數據
    metrics = {
        "roic": fin.roic or 0,
        "roic_percentile": 0.8, # 這裡可改為真實排名
        "margin_delta": 0.02,
        "fcf_yield": (fin.fcf / fin.revenue) if (fin.fcf is not None and fin.revenue) else 0,
        "fcf_percentile": 0.85,
        "interest_coverage": (fin.ebit / (fin.interest_expense or 1)) if fin.ebit and fin.interest_expense else 0
    }
    
    # 呼叫 AI 分析師 (現在包含技術面)
    analyst = StockAIAnalyst()
    report = analyst.analyze_stock(
        {"name": stock.name, "symbol": stock.symbol, "industry": stock.industry},
        metrics,
        tech_summary,
        flow_acc
    )
    
    session.close()
    return {
        "report": report, 
        "metrics": metrics,
        "tech_summary": tech_summary
    }

@app.get("/tasks/progress")
def get_progress():
    session = get_session()
    stocks_count = session.query(Stock).count()
    financials_count = session.query(FinancialData).count()
    session.close()
    return {
        "stocks_count": stocks_count,
        "financials_count": financials_count
    }

@app.post("/tasks/sync-market")
def trigger_sync(background_tasks: BackgroundTasks):
    """
    觸發全台股掃描任務 (背景執行)
    """
    def run_sync():
        scraper = TaiwanStockScraper()
        # 1. 抓取/更新清單
        tickers = scraper.get_ticker_list()
        scraper.sync_tickers_to_db(tickers)
        
        # 2. 抓取財報與股價 (全市場掃描)
        scraper.update_all_financials()
        
        # 3. 計算指標
        session = get_session()
        engine = MetricsEngine(session)
        engine.calculate_all_metrics()
        session.close()

    background_tasks.add_task(run_sync)
    return {"message": "全台股同步任務已啟動"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
