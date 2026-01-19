import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from datetime import datetime

OUTPUT_PDF = f'富亭工作室10~12月銷貨紀錄_{datetime.now().strftime("%Y%m%d")}.pdf'
INPUT_EXCEL = f'帳務資料_{datetime.now().strftime("%Y%m%d")}.xlsx'
FONT_REGULAR = '/System/Library/Fonts/STHeiti Light.ttc'
FONT_BOLD = '/System/Library/Fonts/STHeiti Medium.ttc'

def create_pdf():
    # 1. Register Fonts
    try:
        pdfmetrics.registerFont(TTFont('Heiti', FONT_REGULAR))
        pdfmetrics.registerFont(TTFont('Heiti-Bold', FONT_BOLD))
        print("Fonts registered successfully.")
    except Exception as e:
        print(f"Font registration failed: {e}")
        return

    # 2. Read Data
    try:
        df = pd.read_excel(INPUT_EXCEL)
        # Handle NaT in date
        df['訂單成立日期'] = df['訂單成立日期'].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else '')
        # Handle NaN values
        df = df.fillna('')
    except Exception as e:
        print(f"Failed to read excel: {e}")
        return

    # 3. Setup Doc
    doc = SimpleDocTemplate(OUTPUT_PDF, pagesize=A4, title="富亭工作室銷貨紀錄")
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontName='Heiti-Bold',
        fontSize=18,
        leading=24,
        alignment=1, # Center
        spaceAfter=6
    )
    
    # 4. Header Content
    # 富亭工作室
    # 統一編號：88356482
    # 銷貨記錄簿
    elements.append(Paragraph("富亭工作室", header_style))
    elements.append(Paragraph("統一編號：88356482", header_style))
    elements.append(Paragraph("銷貨記錄簿", header_style))
    elements.append(Spacer(1, 20))

    # 5. Table Data
    # Headers
    data = [df.columns.tolist()]
    # Rows
    for r in df.values.tolist():
        data.append([str(x) for x in r])

    # 6. Table Style
    # Identify summary rows
    # In my previous script, summary rows have "總金額" in the second column (index 1)
    summary_row_indices = []
    for i, row in enumerate(data):
        if i == 0: continue # Header
        # Check specific content logic
        # 1. Date is empty AND Content has "總金額"
        date_val = row[0]
        id_val = str(row[1])
        if "總金額" in id_val:
            summary_row_indices.append(i)

    # Base Style
    tbl_style = [
        ('FONTNAME', (0, 0), (-1, -1), 'Heiti'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # Header background
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'), # Header align
    ]

    # Specific row styles
    for idx in summary_row_indices:
        # Font size 16, Bold (Heiti-Bold)
        tbl_style.append(('FONTSIZE', (0, idx), (-1, idx), 16))
        tbl_style.append(('FONTNAME', (0, idx), (-1, idx), 'Heiti-Bold'))
        # Optional: Add padding for larger text
        tbl_style.append(('BOTTOMPADDING', (0, idx), (-1, idx), 12))
        tbl_style.append(('TOPPADDING', (0, idx), (-1, idx), 12))

    # Create Table
    # Auto-adjust column widths
    t = Table(data, colWidths=[120, 250, 100])
    t.setStyle(TableStyle(tbl_style))
    elements.append(t)

    # Build
    try:
        doc.build(elements)
        print(f"PDF Generated: {OUTPUT_PDF}")
    except Exception as e:
        print(f"Failed to build PDF: {e}")

if __name__ == "__main__":
    create_pdf()
