import re

filepath = '/Users/maxchan/Documents/Development/my-project/學生成績查詢/gas_project_personal/Code.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will cleanly remove the duplicate blocks
start_doget = content.find('function doGet(e) {')
end_doget = content.find('const template = HtmlService.createTemplateFromFile', start_doget)

doget_body_raw = content[start_doget:end_doget]

# Clean up doGet completely
clear_doget = '''function doGet(e) {
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

    // 🆕 Time Limit Check
    const now = new Date();
    if (CONFIG.SYSTEM_OPEN_TIME) {
        const openTime = new Date(CONFIG.SYSTEM_OPEN_TIME);
        if (now < openTime) {
            return HtmlService.createHtmlOutput(`
                <div style="font-family:sans-serif;text-align:center;padding:50px;">
                    <h1>⏳ 系統尚未開放</h1>
                    <p>開放時間：${CONFIG.SYSTEM_OPEN_TIME}</p>
                    <p>請於開放時間後再回來。</p>
                </div>
            `).setTitle('尚未開放');
        }
    }
    if (CONFIG.SYSTEM_CLOSE_TIME) {
        const closeTime = new Date(CONFIG.SYSTEM_CLOSE_TIME);
        if (now > closeTime) {
            return HtmlService.createHtmlOutput(`
                <div style="font-family:sans-serif;text-align:center;padding:50px;">
                    <h1>🛑 查詢活動已結束</h1>
                    <p>截止時間：${CONFIG.SYSTEM_CLOSE_TIME}</p>
                    <p>如有疑問請洽詢老師。</p>
                </div>
            `).setTitle('查詢結束');
        }
    }

    '''

content = content[:start_doget] + clear_doget + content[end_doget:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Code.js sanitized properly")

