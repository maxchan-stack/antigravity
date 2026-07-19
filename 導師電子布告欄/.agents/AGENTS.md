# 專案部署與同步規範

## 1. 雙渠道同步要求
本專案為雙管道部署：
- **Google Apps Script**（由 Apps Script 的 Web App 提供 GAS 內嵌服務）
- **GitHub Pages**（網址為 `https://maxchan-stack.github.io/bulletin-board-web/`）

當您（AI 助理）修改了 `Index.html`、`Code.gs` 或其他後端程式碼時，**必須同時**完成以下兩處更新：

1. **推送至 Google Apps Script**：
   在 `導師電子布告欄/` 目錄執行 `npx @google/clasp push`。
   
2. **推送至 GitHub Pages**：
   - 將 `導師電子布告欄/Index.html` 複製到 `../bulletin-board-web/index.html`。
   - 在 `../bulletin-board-web` 目錄下執行：
     ```bash
     git add index.html
     git commit -m "chore: sync deploy <時間戳記>"
     git push origin main
     ```

## 2. 使用部署腳本
本專案根目錄下已建立 `deploy.sh`。修改完畢後可直接執行 `./deploy.sh` 自動完成上述所有同步與推送步驟。
