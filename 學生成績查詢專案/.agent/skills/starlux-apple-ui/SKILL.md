---
name: starlux-apple-ui
description: 星宇航空官方品牌規範色 x Apple 設計風格 UI 設計規範
---

# 星宇航空 x Apple UI 設計規範

## 概述

本 Skill 定義了融合**星宇航空官方品牌規範色**與 **Apple Human Interface Guidelines** 的 UI 設計系統。適用於所有需要高端精品質感的專案。

---

## 🎨 色彩系統 (Color Palette)

### 品牌規範三色

源自星宇航空官方品牌標準，象徵「早晨→黃昏→夜晚」的時間流動：

| 色彩名稱 | 色碼 | CSS 變數 | 象徵意義 | 推薦用途 |
|----------|------|----------|----------|----------|
| **大地金** | `#9B8A5E` | `--earth-gold` | 早晨・創新思維・熱忱服務 | 標題、強調文字、統計數值 |
| **玫瑰金** | `#B4745A` | `--rose-gold` | 黃昏・專業本位・豪華配備 | 主按鈕、CTA、互動元素 |
| **曜石灰** | `#45464D` | `--obsidian-grey` | 夜晚・謹慎紀律・安全至上 | 卡片背景、深色區塊 |

### 數位校準色（螢幕優化）

為提升螢幕可讀性，可選用以下高亮變體：

| 原色 | 數位校準色 | CSS 變數 | 用途 |
|------|-----------|----------|------|
| 大地金 | `#F9C78B` | `--earth-gold-light` | 小字高亮、次要強調 |
| 大地金 | `#FFB554` | `--earth-gold-bright` | 圖示、徽章 |
| 玫瑰金 | `#794425` | `--rose-gold-deep` | 按鈕漸層深色端 |
| 玫瑰金 | `#C9917A` | `--rose-gold-light` | Hover 狀態 |
| 曜石灰 | `#0F2D3C` | `--obsidian-deep` | 深色模式主背景 |

### 背景色

| 色彩名稱 | 色碼 | CSS 變數 | 說明 |
|----------|------|----------|------|
| **奶油白** | `#F3F1E5` | `--cream-bg` | 取代純白，增加溫度 |
| 奶油深 | `#E8E6DA` | `--cream-dark` | 區塊分隔 |

### 語意色彩 (Apple 風格)

| 用途 | 色碼 | CSS 變數 |
|------|------|----------|
| 成功 | `#32D74B` | `--success` |
| 錯誤 | `#FF453A` | `--error` |
| 警告 | `#FFD60A` | `--warning` |
| 資訊 | `#0A84FF` | `--info` |

---

## ✍️ 字體系統 (Typography)

### 字體堆疊

| 用途 | 字體 | CSS |
|------|------|-----|
| **標題** | Rufina (襯線) | `font-family: 'Rufina', Georgia, serif;` |
| **內文** | Montserrat (無襯線) | `font-family: 'Montserrat', -apple-system, sans-serif;` |
| **程式碼** | SF Mono | `font-family: 'SF Mono', Monaco, monospace;` |

### Google Fonts 載入

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rufina:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 字級規範 (Apple-inspired)

| 等級 | 大小 | 權重 | 用途 |
|------|------|------|------|
| H1 | 32px | 700 | 頁面主標題 |
| H2 | 28px | 700 | 區塊標題 |
| H3 | 22px | 600 | 子區塊標題 |
| Body | 17px | 400 | 內文（iOS 標準） |
| Caption | 13px | 400 | 輔助說明 |
| Small | 11px | 400 | 最小字級 |

---

## 📐 間距與圓角 (Spacing & Radius)

### 間距系統

採用 8px 基準網格：

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-xs` | 4px | 緊湊間距 |
| `--space-s` | 8px | 小間距 |
| `--space-m` | 16px | 標準間距 |
| `--space-l` | 24px | 大間距 |
| `--space-xl` | 32px | 區塊間距 |

### 圓角系統 (iOS-inspired)

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-s` | 8px | 小元件（輸入框內部） |
| `--radius-m` | 16px | 卡片 |
| `--radius-l` | 24px | 大卡片、彈窗 |
| `--radius-pill` | 50px | 膠囊按鈕 |

---

## 🔘 元件設計 (Components)

### 按鈕 (Button)

**主按鈕 (Primary)**：
- 形狀：膠囊狀 (`border-radius: 50px`)
- 背景：玫瑰金漸層 (`linear-gradient(135deg, #794425 0%, #B4745A 50%, #794425 100%)`)
- 文字：白色、粗體、大寫、間距 2px
- 陰影：`0 8px 24px rgba(180, 116, 90, 0.4)`

```css
.btn-primary {
    background: linear-gradient(135deg, var(--rose-gold-deep) 0%, var(--rose-gold) 50%, var(--rose-gold-deep) 100%);
    border-radius: var(--radius-pill);
    color: #FFFFFF;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 18px 32px;
    box-shadow: 0 8px 24px rgba(180, 116, 90, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(180, 116, 90, 0.55);
}
```

**次按鈕 (Secondary)**：
- 背景：透明
- 邊框：1.5px 玫瑰金
- 文字：玫瑰金

### 卡片 (Card)

```css
.card {
    background: var(--obsidian-grey);
    border-radius: var(--radius-m);
    border: 1px solid rgba(155, 138, 94, 0.15);
    box-shadow: 0 8px 24px rgba(69, 70, 77, 0.3);
    padding: 20px 24px;
    color: #FFFFFF;
}
```

### 輸入框 (Input)

```css
.input-group {
    background: var(--obsidian-grey);
    border-radius: var(--radius-l);
    border: 1px solid rgba(155, 138, 94, 0.2);
    overflow: hidden;
}

.input-row {
    padding: 16px;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.1);
}

input {
    background: transparent;
    border: none;
    color: #FFFFFF;
    font-size: 17px;
}
```

---

## 🎭 動效 (Motion)

### 過渡曲線

| 名稱 | 曲線 | 用途 |
|------|------|------|
| 標準 | `cubic-bezier(0.4, 0, 0.2, 1)` | 一般過渡 |
| 進入 | `cubic-bezier(0, 0, 0.2, 1)` | 元素進入 |
| 離開 | `cubic-bezier(0.4, 0, 1, 1)` | 元素離開 |

### 常用動效

```css
/* Hover 上浮 */
.interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

/* 點擊回彈 */
.interactive:active {
    transform: scale(0.98);
}
```

---

## 📋 完整 CSS 變數模板

```css
:root {
    /* ═══════════════════════════════════════════
       星宇航空官方品牌規範色 (STARLUX Brand Colors)
       ═══════════════════════════════════════════ */
    
    /* 大地金 (Earth Gold) - 早晨・創新思維・熱忱服務 */
    --earth-gold: #9B8A5E;
    --earth-gold-light: #F9C78B;
    --earth-gold-bright: #FFB554;
    
    /* 玫瑰金 (Rose Gold) - 黃昏・專業本位・豪華配備 */
    --rose-gold: #B4745A;
    --rose-gold-deep: #794425;
    --rose-gold-light: #C9917A;
    
    /* 曜石灰 (Obsidian Grey) - 夜晚・謹慎紀律・安全至上 */
    --obsidian-grey: #45464D;
    --obsidian-deep: #0F2D3C;
    --obsidian-light: #4E463F;
    
    /* 背景 */
    --cream-bg: #F3F1E5;
    --cream-dark: #E8E6DA;

    /* 語意色彩 (Apple Style) */
    --text-primary: #FFFFFF;
    --text-secondary: rgba(255, 255, 255, 0.6);
    --text-dark: #1D1D1F;
    --success: #32D74B;
    --error: #FF453A;
    --warning: #FFD60A;
    --info: #0A84FF;

    /* 圓角系統 */
    --radius-s: 8px;
    --radius-m: 16px;
    --radius-l: 24px;
    --radius-pill: 50px;
    
    /* 間距系統 */
    --space-xs: 4px;
    --space-s: 8px;
    --space-m: 16px;
    --space-l: 24px;
    --space-xl: 32px;
}
```

---

## ✅ 設計原則

### 星宇精神

1. **溫潤優雅**：低彩度大地色系，避免高飽和刺眼色彩
2. **從容不迫**：充足留白，舒適的視覺節奏
3. **簡約有序**：清晰資訊層級，流暢路徑
4. **激發靈感**：透過視覺氛圍傳遞品牌獨特性

### Apple 風格

1. **Clarity**：清晰易讀的排版
2. **Deference**：內容優先，UI 退居幕後
3. **Depth**：運用陰影與層次感
4. **iOS 標準**：17px 基準字級、連續圓角

---

## 📌 使用方式

在專案中應用此設計系統：

1. 複製 CSS 變數模板到 `:root`
2. 載入 Google Fonts (Rufina + Montserrat)
3. 使用變數建立元件樣式
4. 遵循間距與圓角規範

> **注意**：此設計系統已去除所有航空意象，可直接應用於各類專案。
