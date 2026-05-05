import os
import requests
from dotenv import load_dotenv
from loguru import logger
import json

# 載入環境變數（明確指定 .env 路徑）
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(_env_path)

class StockAIAnalyst:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.error("未找到 GEMINI_API_KEY")
            
    def analyze_stock(self, stock_info, metrics, tech_summary, flow_acceleration):
        """
        透過原生 REST API 呼叫 Gemini 2.0-Flash 進行深度判讀
        """
        if not self.api_key:
            return "AI 判讀暫時無法使用：缺失 API Key"

        # 使用 v1beta 介面配合最新模型指向，以適配使用者的特殊 Key 權限
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={self.api_key}"
        
        # 構造更精確的分析提示詞
        tech_text = "無資料"
        if tech_summary:
            tech_text = f"""
            - 收盤價: {tech_summary.get('close', 'N/A')}
            - 均線趨勢: {tech_summary.get('trend', 'N/A')} (MA20: {tech_summary.get('ma20', 0):.2f}, MA60: {tech_summary.get('ma60', 0):.2f})
            - RSI: {tech_summary.get('rsi', 0):.2f} ({tech_summary.get('momentum', 'N/A')})
            - 交易量: {tech_summary.get('volume', 'N/A')}
            """

        # 這裡處理 stock_info 可能是型別也可能是 dict 的情況
        s_name = stock_info.name if hasattr(stock_info, 'name') else stock_info.get('name', 'Unknown')
        s_symbol = stock_info.symbol if hasattr(stock_info, 'symbol') else stock_info.get('symbol', 'Unknown')
        s_industry = stock_info.industry if hasattr(stock_info, 'industry') else stock_info.get('industry', 'Unknown')

        prompt = f"""
        你是一位專業的台股投資分析師。請針對以下數據進行深度判讀：
        
        個股：{s_name} ({s_symbol})
        產業：{s_industry}
        
        基本面核心指標：
        - ROIC (投入資本回報率): {metrics.get('roic', 0):.2%} (市場排名百分位: {metrics.get('roic_percentile', 0):.2%})
        - FCF Yield (自由現金流收益率): {metrics.get('fcf_yield', 0):.2%}
        - 營業利益率變化: {metrics.get('margin_delta', 0):.2%}
        
        技術面指標：
        {tech_text}
        
        籌碼動力：
        - 機構籌碼加速度: {flow_acceleration:.2f}
        
        請提供繁體中文簡短分析（250字以內），包含：
        1. 綜合評等（建議：強勢加碼/觀望/偏多/減持）
        2. 核心投資邏輯（結合基本面與技術面的共振或背離）
        3. 關鍵決策建議（進場/出場/止損參考位）
        """
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        try:
            # 直接使用 requests 發送 POST，確保路徑與 API 版本正確
            response = requests.post(url, json=payload, timeout=30)
            res_data = response.json()
            
            if 'candidates' in res_data:
                return res_data['candidates'][0]['content']['parts'][0]['text']
            elif 'error' in res_data:
                err_msg = res_data['error'].get('message', '未知錯誤')
                logger.error(f"Gemini API Error: {err_msg}")
                return f"AI 判讀暫時無法使用：API 錯誤 ({err_msg})"
            else:
                logger.error(f"API 回傳格式異常: {json.dumps(res_data)}")
                return "AI 判讀暫時無法使用：格式異常"
        except Exception as e:
            logger.error(f"AI 分析網路故障: {str(e)}")
            return "AI 判讀暫時無法使用：網路連線失敗"
