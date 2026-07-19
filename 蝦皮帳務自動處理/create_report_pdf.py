import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from datetime import datetime

# 設定 4~6 月銷貨紀錄檔名與輸入檔名
OUTPUT_PDF = f'富亭工作室4~6月銷貨紀錄_{datetime.now().strftime("%Y%m%d")}.pdf'
INPUT_EXCEL = f'帳務資料_{datetime.now().strftime("%Y%m%d")}.xlsx'
FONT_REGULAR = '/System/Library/Fonts/STHeiti Light.ttc'
FONT_BOLD = '/System/Library/Fonts/STHeiti Medium.ttc'

def create_pdf():
    # 1. 註冊字型
    try:
        pdfmetrics.registerFont(TTFont('Heiti', FONT_REGULAR))
        pdfmetrics.registerFont(TTFont('Heiti-Bold', FONT_BOLD))
        print("字型註冊成功")
    except Exception as e:
        print(f"字型註冊失敗：{e}")
        return

    # 2. 讀取 Excel 資料
    try:
        df = pd.read_excel(INPUT_EXCEL)
        # 處理日期欄位，NaT 轉成空字串
        df['訂單成立日期'] = df['訂單成立日期'].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else '')
        # 處理 NaN 數值
        df = df.fillna('')
    except Exception as e:
        print(f"讀取 Excel 失敗：{e}")
        return

    # 3. 設定 PDF 文件
    doc = SimpleDocTemplate(OUTPUT_PDF, pagesize=A4, title="富亭工作室4~6月銷貨紀錄")
    elements = []
    
    # 樣式設定
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontName='Heiti-Bold',
        fontSize=18,
        leading=24,
        alignment=1, # 居中
        spaceAfter=6
    )
    
    # 4. 加入標題內容
    elements.append(Paragraph("富亭工作室", header_style))
    elements.append(Paragraph("統一編號：88356482", header_style))
    elements.append(Paragraph("銷貨記錄簿", header_style))
    elements.append(Spacer(1, 20))

    # 5. 表格資料轉換
    data = [df.columns.tolist()]
    for r in df.values.tolist():
        data.append([str(x) for x in r])

    # 6. 設定表格樣式
    # 尋找需要加粗的彙總列 (包含 "總金額" 字樣的行)
    summary_row_indices = []
    for i, row in enumerate(data):
        if i == 0: 
            continue
        id_val = str(row[1])
        if "總金額" in id_val:
            summary_row_indices.append(i)

    # 基礎表格樣式
    tbl_style = [
        ('FONTNAME', (0, 0), (-1, -1), 'Heiti'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # 表頭背景
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'), # 表頭文字居中
    ]

    # 特殊彙總列樣式 (16級加粗)
    for idx in summary_row_indices:
        tbl_style.append(('FONTSIZE', (0, idx), (-1, idx), 16))
        tbl_style.append(('FONTNAME', (0, idx), (-1, idx), 'Heiti-Bold'))
        tbl_style.append(('BOTTOMPADDING', (0, idx), (-1, idx), 12))
        tbl_style.append(('TOPPADDING', (0, idx), (-1, idx), 12))

    # 建立表格並設定欄寬
    t = Table(data, colWidths=[120, 250, 100])
    t.setStyle(TableStyle(tbl_style))
    elements.append(t)

    # 產出 PDF
    try:
        doc.build(elements)
        print(f"PDF 產出成功：{OUTPUT_PDF}")
    except Exception as e:
        print(f"產出 PDF 失敗：{e}")

if __name__ == "__main__":
    create_pdf()
