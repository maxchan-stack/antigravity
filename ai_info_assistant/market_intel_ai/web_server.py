#!/usr/bin/env python3
import uvicorn

if __name__ == "__main__":
    print("🚀 啟動 Market Intel AI (Starlux V1)")
    print("📍 http://localhost:8001")
    uvicorn.run("src.web.app:app", host="0.0.0.0", port=8001, reload=True)
