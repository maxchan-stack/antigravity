import re

filepath = '/Users/maxchan/Documents/Development/my-project/學生成績查詢/gas_project_personal/Code.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate doGet implementation in stable branch Code.js
check_code = '''    // 🆕 System Access Control Check
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('system_status') === 'CLOSED') {
        return HtmlService.createHtmlOutput(`
            <div style="font-family:-apple-system, sans-serif; text-align:center; padding-top:100px;">
                <h1 style="color:#d93025">🛑 系統維護中</h1>
                <p>這段期間暫時不開放線上查詢，若有疑問請洽導師！</p>
            </div>
        `).setTitle("系統維護狀態").addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
'''

block = content.find('function doGet(e) {')
if block != -1:
    idx_insert = content.find('{', block) + 1
    new_content = content[:idx_insert] + '\n' + check_code + content[idx_insert:]
    content = new_content
else:
    print("Cannot find doGet")

# Add Admin menu
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

if 'function onOpen()' not in content:
    content += admin_menu

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to Code.js")
