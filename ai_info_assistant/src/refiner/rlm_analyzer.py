"""
RLM 深度分析模組
================
使用 Recursive Language Model 對文章進行深度多跳分析。
"""

import asyncio
from typing import Optional
from loguru import logger

import sys
from pathlib import Path

# 將本地 lib/rlm 加入路徑 (穩定備案)
lib_path = Path(__file__).parent.parent.parent / "lib" / "rlm"
if lib_path.exists() and str(lib_path) not in sys.path:
    sys.path.insert(0, str(lib_path))

try:
    from rlm.core.rlm import RLM
    from rlm.core.types import ClientBackend
    RLM_AVAILABLE = True
except ImportError as e:
    RLM_AVAILABLE = False
    # 詳細記錄錯誤以排除 rich 缺失問題
    import traceback
    logger.warning(f"⚠️ RLM 模組導入失敗: {e}")
    traceback.print_exc()


class RLMAnalyzer:
    """RLM 深度分析器"""
    
    def __init__(self):
        if not RLM_AVAILABLE:
            raise RuntimeError("RLM 模組未安裝，請執行: uv add rlm")
        
        # 從環境變數讀取配置，支援直連外部 API
        import os
        from dotenv import load_dotenv
        load_dotenv()

        base_url = os.getenv("API_BASE_URL", "http://localhost:3000/v1")
        api_key = os.getenv("API_KEY", "sk-antigravity-default")
        model_name = os.getenv("MODEL_NAME", "gemini-3-flash")

        self.rlm = RLM(
            backend="openai",
            backend_kwargs={
                "base_url": base_url,
                "api_key": api_key,
                "model_name": model_name
            },
            max_iterations=10,
            max_depth=1
        )

    async def analyze(self, title: str, summary: str, url: str) -> str:
        """對文章進行深度分析"""
        # Context 資訊 (會被 RLM 存入 context 變數)
        context_data = f"""論文標題: {title}
摘要內容: {summary}
原始連結: {url}
"""

        # 分析指令 (引導 RLM 的主要任務)
        query = """請針對你當前提供的 context（論文摘要）進行深度且結構化的析。
如果你認為目前資訊不足以回答下列問題，請嘗試使用 llm_query 深入分析內容。

分析維度如下：
1. **核心創新點**：具體指出該研究在技術或理論上的突破。
2. **技術方法**：詳細解構其實作路徑與關鍵演算法。
3. **應用場景**：除了作者提到的，還有哪些潛在的行業應用？
4. **潛在影響**：評價其對現有技術生態的長遠影響。
5. **相關工作**：聯想並列出相關的技術趨勢或研究。

請注意：
- 輸出必須是繁體中文。
- 內容要深入且專業，避免空洞的廢話。
- 當你完成所有分析後，請使用 FINAL(分析內容) 提供最終版本。"""
        
        logger.info(f"🔬 開始 RLM 深度分析 (優化版): {title[:50]}...")
        
        try:
            # 使用 root_prompt 參數來分離指令與資料
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.rlm.completion(prompt=context_data, root_prompt=query)
            )
            logger.success(f"✅ RLM 分析完成: {title[:50]}...")
            return result.response
        except Exception as e:
            logger.error(f"❌ RLM 分析失敗: {e}")
            return f"分析過程中發生錯誤: {str(e)}"


# 單例實例
_analyzer: Optional[RLMAnalyzer] = None


def get_analyzer() -> RLMAnalyzer:
    """獲取 RLM 分析器實例"""
    global _analyzer
    if _analyzer is None:
        _analyzer = RLMAnalyzer()
    return _analyzer
