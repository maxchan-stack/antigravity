from enum import Enum
from pydantic import BaseModel
from typing import List, Optional, Any

class ComparisonMode(str, Enum):
    LOCAL = "local"
    LLM = "llm"

class ComparisonRequest(BaseModel):
    mode: ComparisonMode = ComparisonMode.LOCAL
    ignore_whitespace: bool = False
    ignore_case: bool = False
    ignore_timestamps: bool = False

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: Optional[str] = None

class ComparisonResult(BaseModel):
    similarity_score: float  # 0.0 to 100.0
    differences: List[Any]  # Can be list of bounding boxes, text diff segments, etc.
    summary: Optional[str] = None
    aligned_file_path: Optional[str] = None  # Path/URL to the aligned target image (for Level 3)
