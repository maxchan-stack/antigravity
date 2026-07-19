import os
import subprocess
from datetime import datetime

# 取得今天的日期字串，用於尋找檔案名稱
date_str = datetime.now().strftime("%Y%m%d")
pdf_filename = f"富亭工作室4~6月銷貨紀錄_{date_str}.pdf"
excel_filename = f"帳務資料_{date_str}.xlsx"
pdf_path = os.path.join(os.getcwd(), pdf_filename)
excel_path = os.path.join(os.getcwd(), excel_filename)

def run_script(script_name):
    print(f"正在執行 {script_name}...")
    # 使用 venv 內的 python 執行
    result = subprocess.run([os.path.join('venv', 'bin', 'python'), script_name], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"{script_name} 執行成功！")
    else:
        print(f"{script_name} 執行失敗：\n{result.stderr}")
        exit(1)

def send_email_via_mac_mail():
    print(f"正在準備郵件，並附加檔案：{pdf_filename}...")
    if not os.path.exists(pdf_path):
        print(f"錯誤：找不到產生的 PDF 檔案 ({pdf_path})")
        return

    # 從 Excel 提取總金額數據
    summary_text = ""
    try:
        import pandas as pd
        df = pd.read_excel(excel_path)
        summary_rows = df[df['訂單編號'].astype(str).str.contains('總金額', na=False)]
        for _, row in summary_rows.iterrows():
            # 將數值轉換成整數避免小數點
            val = int(row['買家總支付金額'])
            summary_text += f"{row['訂單編號']}    {val}\n"
    except Exception as e:
        print(f"讀取 Excel 總金額時發生錯誤: {e}")
        summary_text = "無法自動獲取總金額資料\n"

    # 建構信件內文
    email_body = f"""您好
附上工作室銷售額
富亭工作室
統一編號：88356482

{summary_text}"""
    
    # 針對 AppleScript 跳脫換行字元
    escaped_body = email_body.replace('\n', '\\n')

    # 使用 AppleScript 呼叫 Mac 內建的「郵件」App
    applescript_code = f"""
    set theRecipient to "NA11382@ntbt.gov.tw"
    set theSubject to "富亭工作室 統一編號：88356482"
    set theContent to "{escaped_body}"
    set theAttachment to POSIX file "{pdf_path}"

    tell application "Mail"
        set newMessage to make new outgoing message with properties {{subject:theSubject, content:theContent, visible:true}}
        tell newMessage
            make new to recipient at end of to recipients with properties {{address:theRecipient}}
            tell content
                make new attachment with properties {{file name:theAttachment}} at after the last paragraph
            end tell
        end tell
        activate
    end tell
    """
    
    # 執行 AppleScript
    result = subprocess.run(['osascript', '-e', applescript_code], capture_output=True, text=True)
    if result.returncode == 0:
        print("已經成功在 Mac 的「郵件」App 中建立草稿並附上檔案！請至郵件 App 查看並點擊送出。")
    else:
        print(f"建立郵件失敗：\n{result.stderr}")

if __name__ == "__main__":
    print("========== 蝦皮帳務全自動處理流程開始 ==========")
    
    # 步驟 1: 處理 Excel 訂單資料
    run_script('process_orders.py')
    
    # 步驟 2: 產生格式化 PDF
    run_script('create_report_pdf.py')
    
    # 步驟 3: 建立含有附件的郵件
    send_email_via_mac_mail()
    
    print("========== 全自動處理流程完成！==========")
