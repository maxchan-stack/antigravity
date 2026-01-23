# 🧠 AI 資訊助理 (AI Info Assistant)

這是一個基於腦力激盪團隊建議所實作的實戰化工具，旨在從海量的學術論文與熱門開源專案中，提煉出真正具備高價值的知識。

## ✨ 核心特色

- **智能過濾**：
  - 關鍵字篩選 (Rust, AI, LLM)
  - 兩階段 LLM 評分：先用 Flash 模型快速快篩，再用 Pro 模型深度提煉
- **深度分析**：
  - 整合 **RLM (Recursive Language Model)** 進行多跳推理與深度分析
  - 針對學術論文與技術專案提供結構化報告（創新點、技術方法、應用場景）
- **Web UI 介面**：
  - 現代化暗黑風格 (Dark Mode)
  - 來源分頁 (All, ArXiv, GitHub, HN)
  - 多種排序方式 (最新處理、信任度最高、最新發布)
  - 文章刪除與管理功能
根據來源權威性、作者影響力與資訊新鮮度自動打分。
- **真實 LLM 知識提煉**：透過 `antigravity2api-rs` 代理呼叫 Gemini 1.5 Flash，產出結構化的繁體中文摘要與標籤。
- **SQLite 持久化**：自動過濾已處理內容，節省 Token 並保留歷史知識庫。

## 🏗️ 專案架構

```text
ai_info_assistant/
├── src/
│   ├── crawler/        # 資訊源抓取 (ArXiv, GitHub)
│   ├── scoring/        # 信任度評分邏輯
│   ├── refiner/        # LLM 提煉引擎 (正式串接)
│   ├── database/       # SQLite 持久化管理
│   └── models.py       # Pydantic 資料模型
├── data/               # 資料庫儲存空間
├── .env                # API 配置
└── example_usage.py    # 端到端展示腳本
```

## 🚀 快速上手

### 1. 準備環境
本專案使用 `uv` 進行管理，請確保已安裝 `uv`。

### 2. 配置 API (選用)
確認 `antigravity2api-rs` 正在 `localhost:3000` 運行，或修改 `.env` 中的 `API_BASE_URL` 與 `API_KEY`。

### 3. 執行演示
```bash
uv run example_usage.py
```

## 📋 待辦事項 (Roadmap)
- [x] ~~支援更多資訊源 (Hacker News)~~ ✅ 已完成！
- [x] ~~實作 Web UI 展示介面~~ ✅ 已完成！(FastAPI + Jinja2)
- [ ] 整合 RLM 進行更深度的論文分析。

## 🌐 啟動 Web UI
```bash
uv run web_server.py
# 開啟瀏覽器訪問 http://localhost:8000
```

## ⚡ 進階功能

### 定時排程 (自動抓取)
```bash
uv run scheduler.py                # 每 2 小時執行一次
uv run scheduler.py --interval 60  # 每 1 小時執行一次
uv run scheduler.py --once         # 只執行一次
```

### 配置調整 (.env)
```ini
# 抓取數量
ARXIV_MAX_RESULTS=20
HN_MAX_ITEMS=30

# 興趣關鍵字 (只抓取相關內容)
INTEREST_KEYWORDS=AI,LLM,Rust,Python,Machine Learning

# LLM 相關性評分閾值 (0-100)
RELEVANCE_THRESHOLD=60
```

---
*本專案由 Antigravity 團隊協作完成。*
