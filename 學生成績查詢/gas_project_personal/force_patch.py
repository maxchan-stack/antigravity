import re
import os

filepath = '/Users/maxchan/Documents/Development/my-project/學生成績查詢/gas_project_personal/Code.js'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# We completely rewrite doGet 
start_idx = text.find('function doGet(e) {')
end_idx = text.find('function getCaptcha() {')

new_doGet = '''function doGet(e) {
    // 🆕 備用存取控制 (由 Google Sheet 選單控制)
    const scriptProps = PropertiesService.getScriptProperties();
    if (scriptProps.getProperty('system_status') === 'CLOSED') {
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, sans-serif; text-align: center; padding-top: 15%; background: #f5f5f7; margin:0;}
                    .box { background: #fff; padding: 40px 20px; border-radius: 12px; margin: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    h1 { color: #d93025; font-size: 24px; margin-bottom: 10px;}
                    p { color: #555; font-size: 16px; margin-top: 10px; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>🛑 系統維護中</h1>
                    <p>老師正在更新資料，目前暫停放榜。<br>請稍後再回來查看！</p>
                </div>
            </body>
            </html>
        `;
        return HtmlService.createHtmlOutput(errorHtml).setTitle("系統維護狀態").addMetaTag('viewport', 'width=device-width, initial-scale=1');
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

    const template = HtmlService.createTemplateFromFile('Index');

    // 🆕 取得當前登入者 Email (僅在 Workspace 模式有效)
    let activeUser = 'Anonymous (Public Mode)';
    try {
        const email = Session.getActiveUser().getEmail();
        if (email) activeUser = email;
    } catch (e) {
        console.warn('Unable to get active user email:', e);
    }
    template.userEmail = activeUser;

    return template.evaluate()
        .setTitle('物理科段考成績查詢系統')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

'''

text = text[:start_idx] + new_doGet + text[end_idx:]

# Ensure Admin menu exists and correctly formed at the end
if 'function onOpen()' not in text:
    text += '''
// ==========================================
// Admin Menu & System Toggle
// ==========================================
function onOpen() {
    try {
        SpreadsheetApp.getUi()
            .createMenu('⭐ 系統控制台')
            .addItem('▶️ 學生查詢狀態：開啟', 'enableQuerySystem')
            .addItem('⏸️ 學生查詢狀態：關閉', 'disableQuerySystem')
            .addToUi();
    } catch (e) {
        console.warn('onOpen Error:', e);
    }
}

function enableQuerySystem() {
    PropertiesService.getScriptProperties().deleteProperty('system_status');
    SpreadsheetApp.getUi().alert('✅ 系統已開放：現在學生看得到頁面了！');
}

function disableQuerySystem() {
    PropertiesService.getScriptProperties().setProperty('system_status', 'CLOSED');
    SpreadsheetApp.getUi().alert('🛑 系統已關閉：所有點選網址的學生僅會看到【系統維護中】');
}
'''
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("doGet rewrite successful")
