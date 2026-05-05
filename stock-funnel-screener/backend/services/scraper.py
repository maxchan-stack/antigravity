import requests
import pandas as pd
from io import StringIO
import yfinance as yf
from database import get_session, Stock, FinancialData, DailyPrice
from datetime import datetime, timedelta
from loguru import logger
import time
from concurrent.futures import ThreadPoolExecutor

class TaiwanStockScraper:
    def __init__(self):
        self.tse_url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2"
        self.otc_url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4"

    def get_ticker_list(self):
        """
        從證交所獲取所有上市與上櫃股票清單
        """
        logger.info("正在獲取台股清單...")
        tickers = []
        
        for url, market in [(self.tse_url, "TSE"), (self.otc_url, "OTC")]:
            response = requests.get(url)
            response.encoding = 'big5'
            df = pd.read_html(StringIO(response.text))[0]
            
            # 清洗資料
            df.columns = df.iloc[0]
            df = df.iloc[1:]
            
            # 動態尋找「產業類別」所在索引，避免編碼造成的 KeyError
            try:
                industry_idx = -1
                for i, col in enumerate(df.columns):
                    if col and ("產業" in str(col) or "類別" in str(col)):
                        industry_idx = i
                        break
            except:
                industry_idx = 4 # 預設位置
            
            # 過濾出股票 (通常代號長度為 4 且類型為 '股票')
            for index, row in df.iterrows():
                try:
                    val = row.iloc[0]
                    if pd.isna(val):
                        continue
                    
                    parts = str(val).split('\u3000') # 全形空格
                    if len(parts) == 2:
                        symbol, name = parts
                        if len(symbol) == 4: # 排除權證、ETN等，僅保留普通股
                            ticker_suffix = ".TW" if market == "TSE" else ".TWO"
                            
                            # 安全取得產業資訊
                            industry = row.iloc[industry_idx] if industry_idx != -1 else "未知"
                            
                            tickers.append({
                                "symbol": f"{symbol}{ticker_suffix}",
                                "name": name,
                                "industry": industry,
                                "market": market
                            })
                except Exception as e:
                    continue
        
        logger.info(f"共發現 {len(tickers)} 檔股票標的")
        return tickers

    def sync_tickers_to_db(self, tickers):
        """
        將股票清單同步至資料庫
        """
        session = get_session()
        for t in tickers:
            existing = session.query(Stock).filter_by(symbol=t['symbol']).first()
            if not existing:
                new_stock = Stock(
                    symbol=t['symbol'],
                    name=t['name'],
                    industry=t['industry'],
                    market=t['market']
                )
                session.add(new_stock)
        session.commit()
        session.close()
        logger.info("股票清單已更新至資料庫")

    def fetch_stock_financials(self, stock_symbol):
        """
        使用 yfinance 獲取單一股票的財務數據
        """
        try:
            ticker = yf.Ticker(stock_symbol)
            info = ticker.info
            
            # 取得獲利能力與報表
            # yf.Ticker 提供的報表通常是近四年的
            income_stmt = ticker.financials
            balance_sheet = ticker.balance_sheet
            cash_flow = ticker.cashflow
            
            if income_stmt.empty or balance_sheet.empty:
                return None
            
            # 取最近一期的數據 (第一欄)
            latest_date = income_stmt.columns[0]
            
            # 準備數據映射 (處理不同股票可能有缺失欄位的狀況)
            def safe_get(df, label):
                try:
                    return float(df.loc[label].iloc[0])
                except:
                    return 0.0

            data = {
                "period": str(latest_date.year),
                "date": latest_date,
                "revenue": safe_get(income_stmt, 'Total Revenue'),
                "net_income": safe_get(income_stmt, 'Net Income'),
                "ebit": safe_get(income_stmt, 'EBIT'),
                "interest_expense": safe_get(income_stmt, 'Interest Expense'),
                "operating_cash_flow": safe_get(cash_flow, 'Operating Cash Flow'),
                "capital_expenditure": abs(safe_get(cash_flow, 'Capital Expenditure')), # 資本支出通常為負
                "total_assets": safe_get(balance_sheet, 'Total Assets'),
                "total_liabilities": safe_get(balance_sheet, 'Total Liabilities Net Minority Interest'),
                "shareholder_equity": safe_get(balance_sheet, 'Stockholders Equity'),
            }
            
            return data
        except Exception as e:
            logger.error(f"抓取 {stock_symbol} 失敗: {e}")
            return None

    def fetch_daily_prices(self, stock_symbol, period="60d"):
        """
        獲取日 K 線數據
        NOTE: yfinance 新版回傳 MultiIndex DataFrame，需先扁平化欄位
        """
        try:
            df = yf.download(stock_symbol, period=period, interval="1d", progress=False)
            if df.empty:
                return []
            
            # 處理 MultiIndex columns（yfinance 新版格式）
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
            
            prices = []
            for index, row in df.iterrows():
                prices.append({
                    "date": index,
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": float(row['Volume'])
                })
            return prices
        except Exception as e:
            logger.error(f"抓取 {stock_symbol} 股價失敗: {e}")
            return []

    def update_all_financials(self):
        """
        全台股掃描：優先處理尚未有資料或已過期的股票
        """
        session = get_session()
        # 獲取需要更新的股票 (last_updated 為 None 或超過 7 天)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        stocks = session.query(Stock).filter(
            (Stock.last_updated == None) | (Stock.last_updated < seven_days_ago)
        ).all()
            
        logger.info(f"發現 {len(stocks)} 檔股票待更新財報與股價...")
        
        for idx, stock in enumerate(stocks):
            logger.info(f"[{idx+1}/{len(stocks)}] 正在處理 {stock.symbol} ({stock.name})")
            
            # 1. 更新財務數據
            fin_data = self.fetch_stock_financials(stock.symbol)
            if fin_data:
                existing_fin = session.query(FinancialData).filter_by(stock_id=stock.id, period=fin_data['period']).first()
                if not existing_fin:
                    new_fin = FinancialData(stock_id=stock.id, **fin_data)
                    session.add(new_fin)
            
            # 2. 更新日 K 線數據 (技術面)
            price_data = self.fetch_daily_prices(stock.symbol)
            if price_data:
                # 清除舊的日 K，存入新的 (保持最新 60 天)
                session.query(DailyPrice).filter_by(stock_id=stock.id).delete()
                for p in price_data:
                    new_price = DailyPrice(stock_id=stock.id, **p)
                    session.add(new_price)
            
            stock.last_updated = datetime.utcnow()
            session.commit()
            
            # 避免被 yfinance 封鎖
            time.sleep(0.3)

        session.close()
        logger.info("全市場掃描任務完成")

if __name__ == "__main__":
    scraper = TaiwanStockScraper()
    tickers = scraper.get_ticker_list()
    scraper.sync_tickers_to_db(tickers)
    scraper.update_all_financials()
