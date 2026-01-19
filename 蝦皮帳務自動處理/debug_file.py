import pandas as pd
import msoffcrypto
import io

PASSWORD = '281105'
fname = 'Order.completed.20251001_20251031.xlsx'

with open(fname, "rb") as f:
    office_file = msoffcrypto.OfficeFile(f)
    office_file.load_key(password=PASSWORD)
    decrypted = io.BytesIO()
    office_file.decrypt(decrypted)

df = pd.read_excel(decrypted)
print("Columns:", df.columns.tolist())
print("Head:", df.head())
print("Shape:", df.shape)
