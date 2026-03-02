#!/bin/bash

# Configuration
DEPLOYMENT_ID="AKfycbwtmiwyFUYcw2_sXZHcjKF8c8AgVHVhb8EnEyN2VyrybyW5PLYMPo577tOSvv8-kPS7NQ"
VERSION_DESC=$1

if [ -z "$VERSION_DESC" ]; then
    echo "錯誤：請提供版本描述。"
    echo "用法：./deploy.sh \"版本描述文字\""
    echo "範例：./deploy.sh \"V10.4 修正 UI 問題\""
    exit 1
fi

echo "==============================================="
echo "🔒 啟動安全部署程序 (Safe Deploy)"
echo "⚠️ 此腳本確保您不會意外發布到錯誤的網址！"
echo "目標發布 ID: $DEPLOYMENT_ID"
echo "版本描述: $VERSION_DESC"
echo "==============================================="

echo "正在推送最新程式碼至 Google Apps Script..."
clasp push

if [ $? -ne 0 ]; then
    echo "❌ 程式碼推送失敗！部署已終止。"
    exit 1
fi

echo "✅ 推送成功！正在更新專屬網址版號..."
clasp deploy -i "$DEPLOYMENT_ID" -d "$VERSION_DESC"

if [ $? -ne 0 ]; then
    echo "❌ 更新發布版本失敗！"
    exit 1
fi

echo "🎉 部署成功！"
echo "學生的網址不變，已經成功切換至最新版本。"
