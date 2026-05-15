import re

filepath = '/Users/maxchan/Documents/Development/my-project/學生成績查詢/gas_project_personal/Code.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we didn't duplicate `doGet` changes or mess it up
# find function doGet(e) {
block = content.find('function doGet(e) {')

def do_safe_patch(content):
    # check if `system_status` exists in the right place
    start = content.find('function doGet(e) {')
    if start == -1: return content
    
    end = content.find('const template = HtmlService.createTemplateFromFile', start)
    doget_body = content[start:end]
    
    # We want exactly ONE system_status check and ONE app_lock check.
    # The current one:
    # return HtmlService.createHtmlOutput(`...`).setTitle("系統維護狀態").addMetaTag('viewport', 'width=device-width, initial-scale=1');
    if 'system_status' not in doget_body:
        check_code = '''
    // 🆕 備用存取控制 (由 Google Sheet 選單控制)
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('system_status') === 'CLOSED') {
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
        idx_insert = content.find('{', start) + 1
        return content[:idx_insert] + check_code + content[idx_insert:]
    return content

# I will just revert first to 536c2fb code and apply the clean simple code.
