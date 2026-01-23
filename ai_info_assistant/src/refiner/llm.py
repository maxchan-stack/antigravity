import os
import httpx
from typing import Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    """處理對 Antigravity API Gateway (OpenAI 格式) 的呼叫"""
    
    def __init__(self):
        self.base_url = os.getenv("API_BASE_URL", "http://localhost:3000/v1")
        self.api_key = os.getenv("API_KEY", "sk-antigravity-default")
        self.model = os.getenv("MODEL_NAME", "gemini-3-flash")

    async def chat_completion(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """呼叫聊天補全 API"""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"❌ LLM 呼叫失敗: {e}")
                return None
