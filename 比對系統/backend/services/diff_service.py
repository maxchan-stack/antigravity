from typing import Any, Dict
from fastapi.concurrency import run_in_threadpool
from models.schemas import ComparisonResult, ComparisonMode
from services.file_service import FileService

class DiffService:
    def _preprocess_text(self, text: str, ignore_whitespace: bool = False, ignore_case: bool = False, ignore_timestamps: bool = False) -> str:
        import re
        processed = text
        
        if ignore_timestamps:
            # Mask timestamps with generic placeholders
            # YYYY-MM-DD
            processed = re.sub(r'\d{4}-\d{2}-\d{2}', 'YYYY-MM-DD', processed)
            # HH:MM:SS
            processed = re.sub(r'\d{2}:\d{2}:\d{2}', 'HH:MM:SS', processed)
            
        if ignore_case:
            processed = processed.lower()
            
        if ignore_whitespace:
            # Collapse multiple spaces to single space and strip
            processed = re.sub(r'\s+', ' ', processed).strip()
            # Alternatively, if we want to ignore ALL whitespace differences including newlines,
            # we might want to be more aggressive, but usually "ignore whitespace" means
            # ignoring indentation/trailing spaces logic which line-based diff handles well implicitly if we strip lines.
            # But line-by-line diff relies on splitting lines. 
            # If we change all whitespace to single space, we lose line structure.
            # Better strategy for line-based diff: strip each line.
            lines = [line.strip() for line in processed.splitlines()]
            return '\n'.join(lines)

        return processed

    def _compare_text_sync(self, text1: str, text2: str, ignore_whitespace: bool = False, ignore_case: bool = False, ignore_timestamps: bool = False) -> ComparisonResult:
        """
        Synchronous text comparison using difflib with side-by-side alignment & granular diffs (Level 4).
        Internal method, use compare_text (async) instead.
        """
        import difflib
        
        # Preprocess for comparison ONLY (to calculate score and alignment)
        # We might want to show original text in UI but highlight diffs based on processed text?
        # That is complex. For now, let's compare the processed text so users see what is actually ignored (normalized).
        # Or, we compare processed but map back to original. 
        # Simpler approach V1: Display processed text if ignored. 
        # Better approach V1.5: If we ignore case/whitespace/timestamps, the displayed text IS the processed version.
        
        p_text1 = self._preprocess_text(text1, ignore_whitespace, ignore_case, ignore_timestamps)
        p_text2 = self._preprocess_text(text2, ignore_whitespace, ignore_case, ignore_timestamps)
        
        # 1. Similarity Score (Original Logic)
        matcher = difflib.SequenceMatcher(None, p_text1, p_text2)
        similarity = matcher.ratio() * 100
        
        # 2. Granular Diff Logic
        lines1 = p_text1.splitlines()
        lines2 = p_text2.splitlines()
        
        # Use SequenceMatcher to get opcodes for line-based alignment
        line_matcher = difflib.SequenceMatcher(None, lines1, lines2)
        opcodes = line_matcher.get_opcodes()
        
        structured_diff = []
        
        for tag, i1, i2, j1, j2 in opcodes:
            if tag == 'equal':
                for k in range(i2 - i1):
                    structured_diff.append({
                        "type": "equal",
                        "left": {"line": i1 + k + 1, "content": lines1[i1 + k]},
                        "right": {"line": j1 + k + 1, "content": lines2[j1 + k]}
                    })
            elif tag == 'replace':
                # For replacements, try to align lines and possibly compute word-level diffs
                len1 = i2 - i1
                len2 = j2 - j1
                max_len = max(len1, len2)
                
                for k in range(max_len):
                    l_content = lines1[i1 + k] if k < len1 else None
                    r_content = lines2[j1 + k] if k < len2 else None
                    
                    row = {
                        "type": "replace",
                        "left": {"line": i1 + k + 1, "content": l_content} if l_content is not None else {"line": None, "content": ""},
                        "right": {"line": j1 + k + 1, "content": r_content} if r_content is not None else {"line": None, "content": ""}
                    }

                    # Word-level granular diff if both exist
                    if l_content is not None and r_content is not None:
                        # Compute highlights
                        word_matcher = difflib.SequenceMatcher(None, l_content, r_content)
                        row["highlights"] = [
                            (op, a, b, c, d) for op, a, b, c, d in word_matcher.get_opcodes() if op != 'equal'
                        ]
                    
                    structured_diff.append(row)
                    
            elif tag == 'delete':
                for k in range(i2 - i1):
                    structured_diff.append({
                        "type": "delete",
                        "left": {"line": i1 + k + 1, "content": lines1[i1 + k]},
                        "right": {"line": None, "content": ""}
                    })
            elif tag == 'insert':
                for k in range(j2 - j1):
                    structured_diff.append({
                        "type": "insert",
                        "left": {"line": None, "content": ""},
                        "right": {"line": j1 + k + 1, "content": lines2[j1 + k]}
                    })
        
        return ComparisonResult(
            similarity_score=round(similarity, 2),
            differences=structured_diff,
            summary=f"Similarity: {similarity:.2f}%"
        )

    async def compare_text(self, text1: str, text2: str, ignore_whitespace: bool = False, ignore_case: bool = False, ignore_timestamps: bool = False) -> ComparisonResult:
        """
        Async wrapper for text comparison.
        """
        return await run_in_threadpool(self._compare_text_sync, text1, text2, ignore_whitespace, ignore_case, ignore_timestamps)

    def align_images(self, imageA, imageB):
        """
        Aligns imageB to imageA using ORB feature matching and Homography.
        Returns the aligned imageB.
        """
        import cv2
        import numpy as np

        # Convert images to grayscale
        grayA = cv2.cvtColor(imageA, cv2.COLOR_BGR2GRAY)
        grayB = cv2.cvtColor(imageB, cv2.COLOR_BGR2GRAY)

        # Detect ORB features and compute descriptors
        orb = cv2.ORB_create(nfeatures=5000)
        keypointsA, descriptorsA = orb.detectAndCompute(grayA, None)
        keypointsB, descriptorsB = orb.detectAndCompute(grayB, None)
        
        if descriptorsA is None or descriptorsB is None:
             # If no features found, fallback to resize
             h, w = imageA.shape[:2]
             return cv2.resize(imageB, (w, h))

        # Match features using Hamming distance
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = matcher.match(descriptorsA, descriptorsB)

        # Sort matches by score (best matches first)
        matches = sorted(matches, key=lambda x: x.distance)

        # Keep top 15% matches
        keep_percent = 0.15
        keep = int(len(matches) * keep_percent)
        matches = matches[:keep]
        
        if len(matches) < 4:
            # Not enough matches to compute homography, fallback
            h, w = imageA.shape[:2]
            return cv2.resize(imageB, (w, h))

        # Extract location of good matches
        pointsA = np.zeros((len(matches), 2), dtype="float32")
        pointsB = np.zeros((len(matches), 2), dtype="float32")

        for (i, m) in enumerate(matches):
            pointsA[i] = keypointsA[m.queryIdx].pt
            pointsB[i] = keypointsB[m.trainIdx].pt

        # Find homography
        H, mask = cv2.findHomography(pointsB, pointsA, cv2.RANSAC)
        
        if H is None:
             h, w = imageA.shape[:2]
             return cv2.resize(imageB, (w, h))

        # Use homography to warp imageB
        height, width = imageA.shape[:2]
        # Use BORDER_REPLICATE to fill edges with the last pixel instead of black, 
        # mitigating sharp edges that drop similarity score
        aligned_imageB = cv2.warpPerspective(imageB, H, (width, height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

        return aligned_imageB

    def _compare_images_sync(self, img1_path: str, img2_path: str) -> ComparisonResult:
        """
        Synchronous image comparison using OpenCV/SSIM with auto-alignment (Level 3).
        Internal method, use compare_images (async) instead.
        """
        import cv2
        import numpy as np
        import os
        import uuid
        from skimage.metrics import structural_similarity as ssim
        from models.schemas import BoundingBox

        # Load images
        imageA = cv2.imread(img1_path)
        imageB = cv2.imread(img2_path)
        
        if imageA is None or imageB is None:
             return ComparisonResult(similarity_score=0, differences=["Failed to load images"], summary="Error loading images")

        # --- LEVEL 3: Auto Alignment ---
        try:
            imageB = self.align_images(imageA, imageB)
            
            # Save aligned image for frontend usage
            upload_dir = os.path.dirname(img1_path)
            aligned_filename = f"aligned_{uuid.uuid4()}.jpg"
            aligned_path = os.path.join(upload_dir, aligned_filename)
            cv2.imwrite(aligned_path, imageB)
            
            # Generate public URL/Path for frontend
            # Assuming backend serves uploads from /uploads/
            # We will return the relative path that the frontend can construct the URL from, or absolute URL if we knew the host.
            # Passing relative path for now.
            aligned_file_url = f"/uploads/{aligned_filename}" 
            
        except Exception as e:
            print(f"Alignment failed: {e}")
            # Fallback to simple resize
            h, w = imageA.shape[:2]
            imageB = cv2.resize(imageB, (w, h))
            aligned_file_url = None

        # Convert to grayscale
        grayA = cv2.cvtColor(imageA, cv2.COLOR_BGR2GRAY)
        grayB = cv2.cvtColor(imageB, cv2.COLOR_BGR2GRAY)

        # Compute SSIM
        (score, diff) = ssim(grayA, grayB, full=True)
        diff = (diff * 255).astype("uint8")
        similarity_percent = score * 100

        # Threshold the difference image
        thresh = cv2.threshold(diff, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
        
        # Find contours
        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = cnts[0] if len(cnts) == 2 else cnts[1]

        boxes = []
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            # Filter small noise
            if w > 10 and h > 10:
                boxes.append(BoundingBox(x=x, y=y, width=w, height=h))

        return ComparisonResult(
            similarity_score=round(similarity_percent, 2),
            differences=boxes,
            summary=f"Image Similarity: {similarity_percent:.2f}% (Auto-aligned)",
            aligned_file_path=aligned_file_url
        )

    async def compare_images(self, img1_path: str, img2_path: str) -> ComparisonResult:
        """
        Async wrapper for image comparison.
        """
        return await run_in_threadpool(self._compare_images_sync, img1_path, img2_path)

    def _compare_excel_sync(self, file1_path: str, file2_path: str, ignore_whitespace: bool = False, ignore_case: bool = False) -> ComparisonResult:
        """
        Compare two Excel files cell by cell.
        """
        data1 = FileService.read_excel_struct(file1_path)
        data2 = FileService.read_excel_struct(file2_path)
        
        comparison_details = {"sheets": []}
        all_sheets = set(data1.keys()) | set(data2.keys())
        
        total_cells = 0
        matched_cells = 0
        
        for sheet in all_sheets:
            sheet_data = {
                "name": sheet,
                "rows": []
            }
            
            rows1 = data1.get(sheet, [])
            rows2 = data2.get(sheet, [])
            
            # Simple row alignment by index
            max_rows = max(len(rows1), len(rows2))
            
            for i in range(max_rows):
                row1 = rows1[i] if i < len(rows1) else []
                row2 = rows2[i] if i < len(rows2) else []
                
                max_cols = max(len(row1), len(row2))
                row_diff = {"cells": []}
                
                for j in range(max_cols):
                    val1 = str(row1[j]) if j < len(row1) else ""
                    val2 = str(row2[j]) if j < len(row2) else ""
                    
                    # Preprocess for comparison
                    cmp_val1 = val1
                    cmp_val2 = val2
                    
                    if ignore_case:
                        cmp_val1 = cmp_val1.lower()
                        cmp_val2 = cmp_val2.lower()
                    if ignore_whitespace:
                        cmp_val1 = cmp_val1.strip()
                        cmp_val2 = cmp_val2.strip()
                        
                    # Score Calculation Logic:
                    # Ignore matches where both cells are empty (background noise)
                    # Only contribute to score if at least one side has content
                    has_content = bool(cmp_val1) or bool(cmp_val2)
                    
                    if has_content:
                        total_cells += 1
                        if cmp_val1 == cmp_val2:
                            matched_cells += 1
                            row_diff["cells"].append({"value": val1, "status": "equal"})
                        else:
                            row_diff["cells"].append({
                                "value": val2, # Show new value
                                "old_value": val1, # Show old value for tooltip
                                "status": "changed" if val1 and val2 else ("added" if val2 else "deleted")
                            })
                    else:
                         # Both empty - effectively equal but don't count towards score
                         row_diff["cells"].append({"value": val1, "status": "equal"})
                
                sheet_data["rows"].append(row_diff)
            
            comparison_details["sheets"].append(sheet_data)
            
        similarity = (matched_cells / total_cells * 100) if total_cells > 0 else 0
        
        return ComparisonResult(
            similarity_score=round(similarity, 2),
            differences=[comparison_details], # Pass structured dict as first element of list
            summary=f"Excel Comparison: {similarity:.2f}% match across {len(all_sheets)} sheets."
        )

    async def compare_excel(self, file1_path: str, file2_path: str, ignore_whitespace: bool = False, ignore_case: bool = False) -> ComparisonResult:
        return await run_in_threadpool(self._compare_excel_sync, file1_path, file2_path, ignore_whitespace, ignore_case)

    async def compare_web(self, file_path: str) -> ComparisonResult:
        """
        Compare file content against the web to detect potential plagiarism.
        """
        from services.web_search_service import web_search_service
        from services.fingerprint_service import fingerprint_service
        import re

        # 1. Read File
        content = FileService.read_file(file_path)
        if not content:
            return ComparisonResult(similarity_score=0, differences=["Empty file"], summary="No content to check")

        # 2. Extract Keywords (Simple Strategy: First 2 sentences or most frequent words)
        # Better: Search for chunks of text
        # Strategy: extensive search - take 3 random chunks of 50 chars
        import random
        chunks = []
        clean_text = re.sub(r'\s+', ' ', content).strip()
        
        # Take up to 3 queries to avoid rate limits
        if len(clean_text) > 200:
            for _ in range(3):
                start = random.randint(0, len(clean_text) - 100)
                chunk = clean_text[start:start+100]
                chunks.append(chunk)
        else:
            chunks.append(clean_text)

        all_results = []
        for query in chunks:
            results = web_search_service.search_web(query, max_results=3)
            all_results.extend(results)

        # Remove duplicates
        unique_urls = {res['href']: res for res in all_results}
        
        web_matches = []
        
        # 3. Crawl & Compare
        from fastapi.concurrency import run_in_threadpool
        
        for url, res in unique_urls.items():
            # Crawl
            web_text = await run_in_threadpool(web_search_service.crawl_url, url)
            if not web_text:
                continue

            # Compute Similarity
            similarity = fingerprint_service.compute_similarity(content, web_text)
            
            if similarity > 0.1: # Threshold to show
                web_matches.append({
                    "url": url,
                    "title": res.get('title', 'No Title'),
                    "similarity": round(similarity * 100, 2),
                    "snippet": res.get('body', '')
                })

        # Sort by similarity
        web_matches.sort(key=lambda x: x['similarity'], reverse=True)
        top_similarity = web_matches[0]['similarity'] if web_matches else 0.0

        return ComparisonResult(
            similarity_score=0, # This is a plagiarism check, score is max similarity found
            differences=[{"web_matches": web_matches}], # Special structure for frontend
            summary=f"Max Web Similarity: {top_similarity}%"
        )

    async def compare_files(self, file1_path: str, file2_path: str, mode: str, api_key: str = None, 
                          ignore_whitespace: bool = False, ignore_case: bool = False, ignore_timestamps: bool = False) -> ComparisonResult:
        import os
        from services.llm_service import LLMService
        
        # Handle 'web' mode check: file1 vs Web
        if mode == 'web':
            return await self.compare_web(file1_path)
        
        ext = os.path.splitext(file1_path)[1].lower()
        text_extensions = ['.txt', '.md', '.py', '.json', '.csv', '.docx', '.pdf', '.xlsx', '.xls', '.xlsm', '.pptx', '.ppt']
        image_extensions = ['.jpg', '.jpeg', '.png']
        
        # Mapping frontend mode string to Enum if needed, or simple string compare
        if mode == 'llm': # ComparisonMode.LLM
            if ext in text_extensions:
                # Use FileService to read
                content1 = FileService.read_file(file1_path)
                content2 = FileService.read_file(file2_path)
                llm_service = LLMService()
                context_hint = ""
                if ignore_whitespace or ignore_case or ignore_timestamps:
                    context_hint = f"Ignore settings enabled: whitespace={ignore_whitespace}, case={ignore_case}, timestamps={ignore_timestamps}. "
                
                return await llm_service.compare_with_llm(content1, content2, context=context_hint, api_key=api_key)
            else:
                return ComparisonResult(similarity_score=0, differences=["LLM comparison currently only supports text files"], summary="Unsupported for LLM")

        # Local Mode ("local")
        if ext in text_extensions:
            # Special handling for Excel files to use structural comparison if local mode
            if ext in ['.xlsx', '.xls', '.xlsm']:
                return await self.compare_excel(file1_path, file2_path, ignore_whitespace, ignore_case)
            
            content1 = FileService.read_file(file1_path)
            content2 = FileService.read_file(file2_path)
            # Standard Text Comparison
            return await self.compare_text(content1, content2, ignore_whitespace, ignore_case, ignore_timestamps)
        
        elif ext in image_extensions:
            return await self.compare_images(file1_path, file2_path)
            
        else:
            return ComparisonResult(similarity_score=0, differences=[f"Unsupported file type: {ext}"], summary="Error")
