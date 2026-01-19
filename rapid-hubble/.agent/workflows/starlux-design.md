---
description: 星宇航空設計系統 - 提供完整的配色、字體與 UI 設計規範，用於建立符合星宇風格的網頁應用
---

# 星宇航空設計系統 (Starlux Design System)

本技能提供星宇航空的完整設計規範，可用於建立具有精品感的網頁應用程式。

---

## 配色方案 (Color Palette)

### 品牌主色 (Primary Colors)

使用以下 CSS 變數定義品牌主色：

```css
:root {
  /* 品牌主色 */
  --starlux-naval: #202A36;        /* 星宇靛 - 深夜星空感 */
  --starlux-brown: #96664A;        /* 大地褐 - 溫潤優雅 */
  --starlux-cream: #FAF9F7;        /* 象牙白 - 輕盈質感 */
  
  /* 點綴色 */
  --starlux-naval-variant: #3E454B;
  --starlux-brown-variant: #804827;
  --starlux-accent-blue: #1E4568;
  
  /* 漸層 */
  --starlux-gradient-dark: linear-gradient(135deg, #2C4C68 0%, #061D30 100%);
  
  /* 文字色 */
  --starlux-text-primary: #202A36;
  --starlux-text-secondary: #3E454B;
  --starlux-text-light: #FAF9F7;
  
  /* 背景色 */
  --starlux-bg-dark: #202A36;
  --starlux-bg-light: #FAF9F7;
}
```

### 配色使用原則

1. **深色模式 (Dark Mode)** - 使用 `--starlux-naval` 作為主背景
2. **淺色模式 (Light Mode)** - 使用 `--starlux-cream` 作為主背景
3. **強調色** - 使用 `--starlux-brown` 作為 CTA 按鈕或重要元素
4. **漸層** - 標題區域使用 `--starlux-gradient-dark`

---

## 字體系統 (Typography)

### 字體載入

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
```

> [!NOTE]
> Rufina 為付費字體，可使用 Playfair Display 作為替代方案

### CSS 字體定義

```css
:root {
  /* 英文標題 - 優雅襯線體 */
  --font-heading-en: 'Playfair Display', 'Georgia', serif;
  
  /* 英文內文 - 現代無襯線體 */
  --font-body-en: 'Montserrat', 'Arial', sans-serif;
  
  /* 中文字體 */
  --font-chinese: 'Noto Sans TC', '微軟正黑體', sans-serif;
  
  /* 綜合字體堆疊 */
  --font-heading: var(--font-heading-en), var(--font-chinese);
  --font-body: var(--font-body-en), var(--font-chinese);
}

body {
  font-family: var(--font-body);
  font-weight: 400;
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.3;
}
```

---

## UI 元素規範 (UI Components)

### 按鈕樣式

```css
/* 主要按鈕 - 膠囊型 */
.btn-primary {
  background: var(--starlux-gradient-dark);
  color: var(--starlux-text-light);
  border: none;
  border-radius: 50px;
  padding: 12px 32px;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(32, 42, 54, 0.3);
}

/* 次要按鈕 - 褐色 */
.btn-secondary {
  background: var(--starlux-brown);
  color: var(--starlux-text-light);
  border: none;
  border-radius: 50px;
  padding: 12px 32px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--starlux-brown-variant);
}

/* 幽靈按鈕 */
.btn-ghost {
  background: transparent;
  color: var(--starlux-cream);
  border: 1px solid var(--starlux-cream);
  border-radius: 50px;
  padding: 12px 32px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-ghost:hover {
  background: var(--starlux-cream);
  color: var(--starlux-naval);
}
```

### 卡片與容器

```css
/* 玻璃擬態卡片 */
.card-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 24px;
}

/* 深色卡片 */
.card-dark {
  background: var(--starlux-naval);
  color: var(--starlux-text-light);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

/* 淺色卡片 */
.card-light {
  background: var(--starlux-cream);
  color: var(--starlux-text-primary);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
```

---

## 完整樣式模板

建立新專案時，可直接複製以下完整 CSS：

```css
/* ===== 星宇航空設計系統 ===== */

:root {
  /* 品牌主色 */
  --starlux-naval: #202A36;
  --starlux-brown: #96664A;
  --starlux-cream: #FAF9F7;
  
  /* 點綴色 */
  --starlux-naval-variant: #3E454B;
  --starlux-brown-variant: #804827;
  --starlux-accent-blue: #1E4568;
  
  /* 漸層 */
  --starlux-gradient-dark: linear-gradient(135deg, #2C4C68 0%, #061D30 100%);
  
  /* 字體 */
  --font-heading: 'Playfair Display', 'Noto Sans TC', serif;
  --font-body: 'Montserrat', 'Noto Sans TC', sans-serif;
  
  /* 間距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 48px;
  
  /* 圓角 */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 50px;
  
  /* 陰影 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 48px rgba(0, 0, 0, 0.16);
}

/* 基礎樣式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  background: var(--starlux-naval);
  color: var(--starlux-cream);
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: 600;
}

/* 動畫 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease forwards;
}
```

---

## 圖標設計系統 (Icon Design - Apple Style)

結合 Apple Human Interface Guidelines 與 SF Symbols 設計原則，打造精緻一致的圖標體驗。

### 設計原則

| 原則 | 說明 |
|-----|------|
| **簡潔 (Simplicity)** | 使用高度簡化的圖形，避免過多細節 |
| **一致性 (Consistency)** | 統一線條粗細、圓角、視覺重量 |
| **可識別性 (Recognizability)** | 各種尺寸皆清晰可辨識 |
| **可縮放性 (Scalability)** | 向量設計，任意縮放不失真 |

### 圖標規格

```css
:root {
  /* 圖標尺寸 - 對應 SF Symbols 三種 Scale */
  --icon-sm: 16px;   /* Small Scale */
  --icon-md: 24px;   /* Medium Scale (預設) */
  --icon-lg: 32px;   /* Large Scale */
  --icon-xl: 48px;   /* 特大尺寸 */
  
  /* 線條粗細 - 對應 SF Symbols Weight */
  --icon-stroke-light: 1px;
  --icon-stroke-regular: 1.5px;
  --icon-stroke-medium: 2px;
  --icon-stroke-bold: 2.5px;
  
  /* 圖標圓角 - Apple Squircle 風格 */
  --icon-radius: 22.37%;  /* iOS App Icon 圓角比例 */
}
```

### 圖標容器樣式

```css
/* 基礎圖標容器 - Apple 風格圓角方形 */
.icon-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;  /* iOS 風格 Squircle */
  background: var(--starlux-gradient-dark);
  color: var(--starlux-cream);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.icon-container:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(32, 42, 54, 0.3);
}

/* 圖標尺寸變體 */
.icon-container--sm { width: 32px; height: 32px; border-radius: 7px; }
.icon-container--lg { width: 56px; height: 56px; border-radius: 13px; }
.icon-container--xl { width: 72px; height: 72px; border-radius: 16px; }

/* 填充風格 (Filled) - 表示選中狀態 */
.icon-container--filled {
  background: var(--starlux-brown);
}

/* 輪廓風格 (Outlined) */
.icon-container--outlined {
  background: transparent;
  border: 1.5px solid var(--starlux-cream);
}

/* 玻璃擬態風格 */
.icon-container--glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### SF Symbols 渲染模式

支援四種渲染模式以創造視覺層次：

```css
/* 單色模式 (Monochrome) - 單一顏色 */
.icon--mono {
  color: var(--starlux-cream);
}

/* 階層模式 (Hierarchical) - 自動透明度層次 */
.icon--hierarchical {
  color: var(--starlux-cream);
  opacity: 1;
}
.icon--hierarchical .secondary { opacity: 0.5; }
.icon--hierarchical .tertiary { opacity: 0.25; }

/* 調色盤模式 (Palette) - 自訂多色 */
.icon--palette-primary { color: var(--starlux-naval); }
.icon--palette-secondary { color: var(--starlux-brown); }
.icon--palette-tertiary { color: var(--starlux-cream); }

/* 多色模式 (Multicolor) - 預設多彩 */
.icon--multicolor {
  /* 使用 SVG 內建顏色 */
}
```

### 圖標動畫效果

```css
/* 彈跳效果 - 點擊反饋 */
@keyframes iconBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.9); }
}

.icon-bounce:active {
  animation: iconBounce 0.15s ease;
}

/* 脈衝效果 - 通知提示 */
@keyframes iconPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.icon-pulse {
  animation: iconPulse 2s ease-in-out infinite;
}

/* 旋轉效果 - 載入狀態 */
@keyframes iconSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.icon-spin {
  animation: iconSpin 1s linear infinite;
}
```

### React 圖標組件

```tsx
// StarluxIcon.tsx
import { LucideIcon } from 'lucide-react';

interface StarluxIconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'outlined' | 'glass' | 'default';
  animate?: 'bounce' | 'pulse' | 'spin' | 'none';
  onClick?: () => void;
}

const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };

const StarluxIcon: React.FC<StarluxIconProps> = ({
  icon: Icon,
  size = 'md',
  variant = 'default',
  animate = 'none',
  onClick
}) => {
  const containerClass = [
    'icon-container',
    size !== 'md' && `icon-container--${size}`,
    variant !== 'default' && `icon-container--${variant}`,
    animate !== 'none' && `icon-${animate}`
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass} onClick={onClick}>
      <Icon size={sizeMap[size]} strokeWidth={1.5} />
    </div>
  );
};
```

### 推薦圖標庫

| 庫名 | 說明 | 推薦原因 |
|-----|------|---------|
| **Lucide React** | SF Symbols 風格開源圖標 | 線條一致、支援 Tree Shaking |
| **Heroicons** | Tailwind 官方圖標 | 簡潔現代、雙版本 (outline/solid) |
| **Phosphor Icons** | 靈活多變體圖標 | 6 種變體、設計精緻 |

```bash
# 安裝推薦圖標庫
npm install lucide-react
# 或
npm install @heroicons/react
```

---

## 設計原則

1. **奢華感 (Luxurious)** - 使用大地色系搭配深色背景
2. **現代感 (Modern)** - 圓角元素、漸層效果、玻璃擬態
3. **精品感 (Premium)** - 大量留白、精緻字體、細膩陰影
4. **一致性 (Consistency)** - 統一使用 CSS 變數確保視覺統一

---

## 使用範例

### React 組件範例

```tsx
// StarluxButton.tsx
interface StarluxButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
}

const StarluxButton: React.FC<StarluxButtonProps> = ({ 
  variant = 'primary', 
  children, 
  onClick 
}) => {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

### HTML 結構範例

```html
<section class="hero" style="background: var(--starlux-gradient-dark);">
  <div class="container">
    <h1>探索星宇世界</h1>
    <p>精品航空的全新體驗</p>
    <button class="btn-primary">立即預訂</button>
  </div>
</section>
```
