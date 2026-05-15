from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from services.diff_service import DiffService
from services.file_service import FileService
from models.schemas import ComparisonResult, ComparisonMode
from pydantic import BaseModel
from fastapi import File, UploadFile, HTTPException, Form
import shutil
import os
import uuid

app = FastAPI(title="Comparison System API", description="API for Side-by-Side Comparison System")

# Configure CORS
from fastapi.staticfiles import StaticFiles

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, recommend using specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (for aligned images)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    import sys
    import os
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)

# Serve Frontend Static Files (if they exist)
# In dev: we might not use this if running separate vite server
# In prod/frozen: we expect 'dist' folder to be bundled
dist_path = get_resource_path("dist")
assets_path = os.path.join(dist_path, "assets")

if os.path.exists(dist_path):
    # Mount assets folder
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    # Serve index.html for root and unknown routes (SPA fallback)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to pass through (they are defined before this)
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
             raise HTTPException(status_code=404, detail="Not Found")
             
        # Check if file exists in dist (e.g. favicon.ico)
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
            
        # Fallback to index.html
        from fastapi.responses import FileResponse
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Comparison System API is running (Frontend not found)"}

class TextComparisonRequest(BaseModel):
    text1: str
    text2: str
    mode: ComparisonMode = ComparisonMode.LOCAL

diff_service = DiffService()

@app.post("/compare/text", response_model=ComparisonResult)
async def compare_text_endpoint(request: TextComparisonRequest):
    if request.mode == ComparisonMode.LOCAL:
        return await diff_service.compare_text(request.text1, request.text2)
    else:
        # TODO: Integrate LLM Service
        # For now fallback to local, but ideally this should call LLM logic if implemented
        return await diff_service.compare_text(request.text1, request.text2)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/compare/files", response_model=ComparisonResult)
async def compare_files_endpoint(
    background_tasks: BackgroundTasks,
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    mode: ComparisonMode = ComparisonMode.LOCAL,
    api_key: Optional[str] = Form(None),
    ignore_whitespace: bool = Form(False),
    ignore_case: bool = Form(False),
    ignore_timestamps: bool = Form(False)
):
    # Save files
    f1_id = str(uuid.uuid4())
    f2_id = str(uuid.uuid4())
    f1_path = os.path.join(UPLOAD_DIR, f"{f1_id}_{file1.filename}")
    f2_path = os.path.join(UPLOAD_DIR, f"{f2_id}_{file2.filename}")
    
    try:
        with open(f1_path, "wb") as buffer:
            shutil.copyfileobj(file1.file, buffer)
        with open(f2_path, "wb") as buffer:
            shutil.copyfileobj(file2.file, buffer)
            
        # Register cleanup task
        background_tasks.add_task(FileService.cleanup_files, [f1_path, f2_path])

        # Execute comparison
        return await diff_service.compare_files(f1_path, f2_path, mode, api_key=api_key, 
                                              ignore_whitespace=ignore_whitespace, 
                                              ignore_case=ignore_case, 
                                              ignore_timestamps=ignore_timestamps)

    except Exception as e:
        # If error occurs before background task is registered/run, we try to cleanup immediately
        FileService.cleanup_files([f1_path, f2_path])
        raise HTTPException(status_code=500, detail=str(e))
