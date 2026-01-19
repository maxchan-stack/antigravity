import pandas as pd
import msoffcrypto
import io
import os

PASSWORD = '281105'
FILES = [
    'Order.completed.20251001_20251031.xlsx',
    'Order.completed.20251101_20251130.xlsx',
    'Order.completed.20251201_20251231.xlsx'
]
TARGET_COLS = ['訂單成立日期', '訂單編號', '買家總支付金額']
OUTPUT_FILE = '帳務資料.xlsx'

def process_files():
    dfs = []
    
    print("Beginning processing...")
    
    for fname in FILES:
        fpath = os.path.join(os.getcwd(), fname)
        if not os.path.exists(fpath):
            print(f"Warning: File not found: {fname}")
            continue
            
        try:
            # Decrypt
            decrypted = io.BytesIO()
            with open(fpath, "rb") as f:
                office_file = msoffcrypto.OfficeFile(f)
                office_file.load_key(password=PASSWORD)
                office_file.decrypt(decrypted)
            
            # Read
            df = pd.read_excel(decrypted)
            
            # Normalize columns (strip spaces)
            df.columns = [str(c).strip() for c in df.columns]
            
            # Check cols
            missing = [c for c in TARGET_COLS if c not in df.columns]
            if missing:
                print(f"Error: File {fname} missing columns: {missing}")
                continue
                
            # Keep only needed columns
            df = df[TARGET_COLS]
            dfs.append(df)
            print(f"Processed {fname}, rows: {len(df)}")
            
        except Exception as e:
            print(f"Failed to process {fname}: {e}")

    if not dfs:
        print("No data found.")
        return

    # Merge
    merged_df = pd.concat(dfs, ignore_index=True)
    
    # Process
    # Convert date
    merged_df['訂單成立日期'] = pd.to_datetime(merged_df['訂單成立日期'])
    
    # Sort
    merged_df = merged_df.sort_values(by='訂單成立日期', ascending=True)
    
    # Drop duplicates by Order ID
    before_dedup = len(merged_df)
    merged_df = merged_df.drop_duplicates(subset=['訂單編號'], keep='first')
    after_dedup = len(merged_df)
    print(f"Dropped {before_dedup - after_dedup} duplicates.")
    
    # Ensure numerical
    # Remove non-numeric chars if any (like '$' or ',')
    # Assuming standard numeric but just in case
    # Convert '買家總支付金額' to string then replace ',' then to numeric
    merged_df['買家總支付金額'] = merged_df['買家總支付金額'].astype(str).str.replace(',', '').str.replace('$', '')
    merged_df['買家總支付金額'] = pd.to_numeric(merged_df['買家總支付金額'], errors='coerce').fillna(0)
    
    # Save
    # Convert date back to string or keep as datetime in excel?
    # Usually datetime is fine.
    merged_df.to_excel(OUTPUT_FILE, index=False)
    print(f"Saved {OUTPUT_FILE}")
    
    # Stats
    merged_df['Month'] = merged_df['訂單成立日期'].dt.to_period('M')
    monthly_sums = merged_df.groupby('Month')['買家總支付金額'].sum()
    grand_total = merged_df['買家總支付金額'].sum()
    
    print("\n--- 統計結果 ---")
    for period, total in monthly_sums.items():
        print(f"{period}: {int(total)}")
        
    print(f"三個月合併總金額: {int(grand_total)}")

if __name__ == "__main__":
    process_files()
