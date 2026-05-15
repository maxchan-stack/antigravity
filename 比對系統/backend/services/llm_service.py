from models.schemas import ComparisonResult

class LLMService:
    async def compare_with_llm(self, content1: str, content2: str, context: str = "", api_key: str = None) -> ComparisonResult:
        import os
        from openai import OpenAI, AsyncOpenAI
        import json
        
        # Use provided key or fallback to env var
        final_api_key = api_key or os.environ.get("OPENAI_API_KEY")
        
        if not final_api_key:
             # Return a mock result if no key is present, to allow UI testing
            return ComparisonResult(
                similarity_score=0.0, 
                differences=["未偵測到 API Key。請在介面上輸入您的 OpenAI API Key。"], 
                summary="缺 API Key (Missing API Key)"
            )

        client = AsyncOpenAI(api_key=final_api_key)
        
        prompt = f"""
        Compare the following two texts/contents and provide a similarity score (0-100) and a list of key differences.
        
        Content 1:
        {content1[:15000]}... (truncated if too long)
        
        Content 2:
        {content2[:15000]}... (truncated if too long)
        
        Context: {context}
        
        Return JSON format:
        {{
            "similarity_score": <float>,
            "differences": ["diff1", "diff2", ...],
            "summary": "Short summary of comparison"
        }}
        """
        
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return ComparisonResult(**data)
            
        except Exception as e:
            return ComparisonResult(
                similarity_score=0.0,
                differences=[str(e)],
                summary="Error during LLM comparison"
            )
