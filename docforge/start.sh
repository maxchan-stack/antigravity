#!/bin/bash

# DocForge 快速啟動腳本
# 使用方式：點擊此檔案即可啟動應用

echo "🚀 正在啟動 DocForge..."
echo ""

# 檢查 dist 目錄是否存在
if [ ! -d "dist" ]; then
    echo "⚠️  尚未建構專案，正在建構..."
    npm run build
    echo ""
fi

# 使用 Python 啟動簡易伺服器
if command -v python3 &> /dev/null; then
    echo "✅ 已啟動 DocForge"
    echo "📂 瀏覽器將自動開啟 http://localhost:8080"
    echo ""
    echo "⏹  按 Ctrl+C 停止伺服器"
    echo ""
    
    # 自動開啟瀏覽器
    sleep 2
    open http://localhost:8080
    
    # 啟動伺服器
    cd dist
    python3 -m http.server 8080
else
    echo "❌ 找不到 Python3，請手動開啟 dist/index.html"
fi
