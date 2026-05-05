import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# 資料庫路徑
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "stocks.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

Base = declarative_base()

class Stock(Base):
    """
    股票基本資訊表
    """
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), unique=True, nullable=False, index=True)  # 例如: 2330.TW
    name = Column(String(100))
    industry = Column(String(100), index=True)
    market = Column(String(20))  # TSE or OTC
    last_updated = Column(DateTime, nullable=True)

    # 關聯
    financials = relationship("FinancialData", back_populates="stock", cascade="all, delete-orphan")
    prices = relationship("DailyPrice", back_populates="stock", cascade="all, delete-orphan")

class FinancialData(Base):
    """
    財務報表數據表 (季度/年度)
    """
    __tablename__ = "financial_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    period = Column(String(10))  # 2023Q4, 2024Q1 等
    date = Column(DateTime, nullable=False)
    
    # 核心指標 (Raw Data)
    revenue = Column(Float)
    net_income = Column(Float)
    operating_cash_flow = Column(Float)
    capital_expenditure = Column(Float)
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    shareholder_equity = Column(Float)
    ebit = Column(Float)
    interest_expense = Column(Float)
    
    # 計算後的精華指標 (Cached)
    fcf = Column(Float)  # Free Cash Flow
    roic = Column(Float)
    margin_net = Column(Float)
    
    stock = relationship("Stock", back_populates="financials")

class DailyPrice(Base):
    """
    日 K 線與籌碼數據
    """
    __tablename__ = "daily_prices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    
    # 籌碼面
    institutional_buy_sell = Column(Float)  # 三大法人買賣超
    margin_balance = Column(Float)         # 融資餘額
    
    stock = relationship("Stock", back_populates="prices")

# 初始化資料庫
def init_db():
    from sqlalchemy import create_engine
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    return engine

def get_session():
    from sqlalchemy import create_engine
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    return Session()

if __name__ == "__main__":
    init_db()
    print(f"資料庫已初始化於: {DB_PATH}")
