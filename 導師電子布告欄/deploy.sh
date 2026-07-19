#!/bin/bash
# 導師電子布告欄 一鍵同步部署腳本
# WEB_APP_URL 必須與此 deployment id 一致：
# https://script.google.com/macros/s/AKfycbyXt1vNUGZVOiZrs88Z9Bp8XWun4WzV_YnZRFWGe3j7NENiKL9m02hJyfH_KJ_sB8P8/exec
set -euo pipefail

# 專用 bulletin-api 專案（可部署）；原始 Index 專案若 domain 擋 deploy 則改推此專案
DEPLOY_ID="AKfycbyQr4WjfdF_sNs7z1VyngP0rPxYJJEpGsp1i7dO_MHR5w5egCvJIjVMFavea_CnHHgPeA"
API_SCRIPT_DIR="/tmp/gas-bulletin-api"
DESC="Sync Deploy $(date '+%Y-%m-%d %H:%M:%S')"

echo "1. 推送更新至 Google Apps Script..."
npx @google/clasp push -f

echo "1b. 嘗試更新 Web App 版本（與前端 WEB_APP_URL 同一 deployment）..."
if npx @google/clasp deploy -i "$DEPLOY_ID" -d "$DESC"; then
  echo "   ✅ Web App 版本已更新"
else
  echo "   ⚠️ clasp deploy 失敗（可能是網域權限）。原始碼已 push；請用學校帳號在 script.google.com 手動「管理部署 → 新版本」。"
fi

echo "2. 同步到 GitHub Pages (bulletin-board-web)..."
cp Index.html ../bulletin-board-web/bulletin.html
cp StudentPortal.html ../bulletin-board-web/index.html
cp ParentPortal.html ../bulletin-board-web/parent.html
cp admin.html ../bulletin-board-web/admin.html 2>/dev/null || true
cp calendar.pdf ../bulletin-board-web/calendar.pdf 2>/dev/null || true

echo "3. 提交並推送至 GitHub..."
cd ../bulletin-board-web
git add index.html parent.html bulletin.html calendar.pdf admin.html 2>/dev/null || git add index.html parent.html bulletin.html admin.html
if git diff --cached --quiet; then
  echo "   （無檔案變更，略過 commit）"
else
  git commit -m "chore: sync deploy $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin main
fi

echo "部署已完成！"
echo "佈告欄：https://maxchan-stack.github.io/bulletin-board-web/bulletin.html"
