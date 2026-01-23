#!/usr/bin/env python3
"""
AI 資訊助理 Web UI 啟動器
使用方式: uv run web_server.py
"""

import uvicorn
from src.web.app import app

if __name__ == "__main__":
    print("🚀 啟動 AI 資訊助理 Web UI (開發模式)")
    print("📍 開啟瀏覽器訪問: http://localhost:8000")
    print("👀 程式碼變更將自動重載")
    uvicorn.run("src.web.app:app", host="0.0.0.0", port=8000, reload=True)
