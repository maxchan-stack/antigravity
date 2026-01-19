import os
import hashlib
import json
import sys

# Set encoding for output
sys.stdout.reconfigure(encoding='utf-8')

target_dir = r"c:\Users\User\Downloads\島民行政中心"
files_by_hash = {}

def get_file_hash(filepath):
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read(65536)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(65536)
        return hasher.hexdigest()
    except Exception as e:
        return None

try:
    files = [f for f in os.listdir(target_dir) if os.path.isfile(os.path.join(target_dir, f))]
    results = []

    for filename in files:
        if filename == "find_dupes.py": continue
        filepath = os.path.join(target_dir, filename)
        file_hash = get_file_hash(filepath)
        
        if file_hash:
            if file_hash in files_by_hash:
                files_by_hash[file_hash].append(filename)
            else:
                files_by_hash[file_hash] = [filename]

    duplicates = []
    for fhash, filenames in files_by_hash.items():
        if len(filenames) > 1:
            duplicates.append({
                "hash": fhash,
                "files": filenames
            })

    print(json.dumps(duplicates, ensure_ascii=False, indent=2))

except Exception as e:
    print(f"Error: {e}")
