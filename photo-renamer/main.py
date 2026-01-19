"""
批量照片改名工具 - FastAPI 後端
"""
import os
from pathlib import Path
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


app = FastAPI(title="批量照片改名工具")


class RenameRequest(BaseModel):
    """改名請求模型"""
    folder_path: str
    prefix: str
    start_number: int = 1
    digit_count: int = 3


class FileInfo(BaseModel):
    """檔案資訊模型"""
    original_name: str
    new_name: str
    file_path: str


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """返回首頁 HTML"""
    html_path = Path(__file__).parent / "index.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()


@app.get("/style.css")
async def get_style():
    """返回 CSS 檔案"""
    css_path = Path(__file__).parent / "style.css"
    with open(css_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), media_type="text/css")


@app.get("/script.js")
async def get_script():
    """返回 JavaScript 檔案"""
    js_path = Path(__file__).parent / "script.js"
    with open(js_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), media_type="application/javascript")


@app.post("/api/scan-folder")
async def scan_folder(request: RenameRequest) -> JSONResponse:
    """
    掃描資料夾並返回 JPG 檔案列表及預覽改名結果
    """
    folder_path = Path(request.folder_path)
    
    # 檢查資料夾是否存在
    if not folder_path.exists():
        raise HTTPException(status_code=404, detail="資料夾不存在")
    
    if not folder_path.is_dir():
        raise HTTPException(status_code=400, detail="路徑不是資料夾")
    
    # 掃描 JPG 檔案
    jpg_files = sorted([
        f for f in folder_path.iterdir()
        if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg']
    ], key=lambda x: x.name)
    
    # 生成預覽列表
    preview_list: List[FileInfo] = []
    for idx, file in enumerate(jpg_files, start=request.start_number):
        new_name = f"{request.prefix}{str(idx).zfill(request.digit_count)}.jpg"
        preview_list.append(FileInfo(
            original_name=file.name,
            new_name=new_name,
            file_path=str(file)
        ))
    
    return JSONResponse({
        "success": True,
        "total": len(preview_list),
        "files": [f.dict() for f in preview_list]
    })


@app.post("/api/rename")
async def rename_files(request: RenameRequest) -> JSONResponse:
    """
    執行批量改名
    """
    folder_path = Path(request.folder_path)
    
    if not folder_path.exists():
        raise HTTPException(status_code=404, detail="資料夾不存在")
    
    # 掃描 JPG 檔案
    jpg_files = sorted([
        f for f in folder_path.iterdir()
        if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg']
    ], key=lambda x: x.name)
    
    renamed_count = 0
    errors = []
    
    # 執行改名
    for idx, file in enumerate(jpg_files, start=request.start_number):
        try:
            new_name = f"{request.prefix}{str(idx).zfill(request.digit_count)}.jpg"
            new_path = folder_path / new_name
            
            # 避免覆蓋已存在的檔案
            if new_path.exists() and new_path != file:
                errors.append(f"{file.name} → {new_name} (目標檔案已存在)")
                continue
            
            file.rename(new_path)
            renamed_count += 1
        except Exception as e:
            errors.append(f"{file.name}: {str(e)}")
    
    return JSONResponse({
        "success": len(errors) == 0,
        "renamed_count": renamed_count,
        "total": len(jpg_files),
        "errors": errors
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
