@echo off
echo ==========================================
echo   AI Stock Funnel Screener - 啟動服務中
echo ==========================================

REM 檢查並安裝 Python 依賴
echo [1/3] 檢查 Python 依賴環境...
python -m pip install fastapi sqlalchemy yfinance pandas pandas-ta google-generativeai loguru uvicorn pydantic pydantic-settings aiosqlite scikit-learn scipy mplfinance --quiet
if %errorlevel% neq 0 (
    echo [警告] Python 依賴自動安裝遇到問題，請嘗試手動執行：pip install -r backend\requirements.txt
)

REM 啟動後端伺服器 (背景執行)
echo [2/3] 啟動後端 API 伺服器 (Uvicorn @ 8000)...
start "Stock-Backend" /b python backend/main.py

REM 啟動前端開發伺服器
echo [3/3] 啟動前端 UI 伺服器 (Vite @ 5199)...
cd frontend
start "Stock-Frontend" /b npm run dev -- --port 5199

echo ==========================================
echo   服務已在背景啟動！
echo   - 前端: http://localhost:5199
echo   - 後端: http://localhost:8000
echo ==========================================
echo 提示：若 5173 仍顯示舊專案，是因為該埠位被其他程序佔用且有快取。
echo 請直接使用新的埠位 5199 進行存取。
pause
