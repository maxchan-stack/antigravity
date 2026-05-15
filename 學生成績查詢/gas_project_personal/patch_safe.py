filepath = '/Users/maxchan/Documents/Development/my-project/學生成績查詢/gas_project_personal/Code.js'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

toggle_logic = '''
    // 🆕 備用存取控制 (由 Google Sheet 選單控制)
    const scriptProps = PropertiesService.getScriptProperties();
    if (scriptProps.getProperty('system_status') === 'CLOSED') {
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, sans-serif; text-align: center; padding-top: 20%; background: #f5f5f7; }
                    h1 { color: #d93025; }
                    p { color: #555; font-size: 16px; margin-top: 10px; }
                </style>
            </head>
            <body>
                <h1>🛑 系統維護中</h1>
                <p>目前老師正在更新或核對成績資源，所有查詢功能已暫停使用。<br>請稍後再回來查看您的成績！</p>
            </body>
            </html>
        `;
        return HtmlService.createHtmlOutput(errorHtml).setTitle("系統維護狀態");
    }
'''

new_text = text.replace("function doGet(e) {", "function doGet(e) {" + toggle_logic)

admin_menu = '''
// ==========================================
// Admin Menu & System Toggle
// ==========================================
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('⭐ 系統控制台')
        .addItem('▶️ 學生查詢狀態：開啟', 'enableQuerySystem')
        .addItem('⏸️ 學生查詢狀態：關閉', 'disableQuerySystem')
        .addToUi();
}

function enableQuerySystem() {
    PropertiesService.getScriptProperties().deleteProperty('system_status');
    SpreadsheetApp.getUi().alert('系統狀態已更新', '✅ 系統已開放：現在學生看得到頁面了！', SpreadsheetApp.getUi().ButtonSet.OK);
}

function disableQuerySystem() {
    PropertiesService.getScriptProperties().setProperty('system_status', 'CLOSED');
    SpreadsheetApp.getUi().alert('系統狀態已更新', '🛑 系統已關閉：所有點選網址的學生僅會看到【系統維護中】', SpreadsheetApp.getUi().ButtonSet.OK);
}
'''
if "function onOpen()" not in new_text:
    new_text += admin_menu

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Applied beautifully.")
