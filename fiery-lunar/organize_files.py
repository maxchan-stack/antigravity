import os
import glob
from collections import Counter

def check_setup():
    print("=== 作業批改專案環境檢查 ===")
    
    # 1. 檢查 Rubric
    rubric_path = "rubric.md"
    if os.path.exists(rubric_path):
        with open(rubric_path, "r", encoding="utf-8") as f:
            content = f.read()
            if "__" in content:
                print(f"[WARNING] ⚠️  {rubric_path} 似乎尚未填寫完成 (發現標記 '__')")
            else:
                print(f"[OK] ✅ {rubric_path} 已存在")
    else:
        print(f"[ERROR] ❌ 找不到 {rubric_path}")

    # 2. 檢查作業檔案
    raw_dir = os.path.join("submissions", "raw")
    if not os.path.exists(raw_dir):
        try:
            os.makedirs(raw_dir)
            print(f"[INFO] 已建立目錄: {raw_dir}")
        except OSError as e:
            print(f"[ERROR] 無法建立目錄: {e}")
            return

    files = [f for f in glob.glob(os.path.join(raw_dir, "*")) if os.path.isfile(f)]
    count = len(files)
    
    if count == 0:
        print(f"[WARNING] ⚠️  {raw_dir} 是空的！請將作業檔案放入此資料夾。")
    else:
        print(f"[OK] ✅ 在 {raw_dir} 中發現 {count} 個檔案。")
        # 統計副檔名
        exts = Counter([os.path.splitext(f)[1].lower() for f in files])
        print("    檔案分佈:")
        for ext, c in exts.items():
            print(f"    - {ext}: {c} 份")

if __name__ == "__main__":
    check_setup()
