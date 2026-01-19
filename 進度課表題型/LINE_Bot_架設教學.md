# 教學日誌 LINE 機器人架設教學 (給朋友版)

這份教學會教你如何架設自己的 LINE 機器人，並連結到「教學進度表」。
完成後，你在 LINE 上面打字，進度就會自動同步到網頁上！

---

## 步驟一：準備 Google Sheet (資料庫)
這會是用來儲存你所有教學紀錄的地方。

1.  登入你的 Google 帳號。
2.  建立一個 **新的 Google Sheet (試算表)**。
3.  幫它取個名字，例如「我的教學進度」。
4.  **記下網址裡面的 ID**：
    *   網址長這樣：`https://docs.google.com/spreadsheets/d/`**`只要複製這裡的一長串亂碼`**`/edit...`
    *   這串亂碼就是「Sheet ID」，等一下會用到。

---

## 步驟二：建立 LINE 機器人
這會是可以跟你對話的機器人。

1.  前往 [LINE Developers Console](https://developers.line.biz/) 並登入你的 LINE。
2.  如果是第一次使用，請先建立一個 **Provider** (名稱隨便取，例如 "MyBot")。
3.  建立一個新的 **Channel**，類型選擇 **"Messaging API"**。
    *   填寫必填欄位 (App name, Description 等)，隨便填即可。
4.  建立完成後，點選 **Messaging API** 分頁。
5.  往下滑，找到 **Channel access token**，點擊 **Issue** (發行)。
6.  **複製這一長串 Token**，等一下會用到。

---

## 步驟三：設定程式碼 (Google Apps Script)
這是讓 LINE 和 Google Sheet 溝通的橋樑。

1.  前往 [Google Apps Script 網站](https://script.google.com/home)。
2.  點選左上角的 **「新專案」**。
3.  你會看到一個編輯器，請把裡面的程式碼 **全部刪除**。
4.  **複製貼上** 附錄在本文最後面的程式碼。
5.  **修改最上方的兩行**：
    *   `var SHEET_ID = '...'`：引號內貼上步驟一的 IDs。
    *   `var LINE_CHANNEL_ACCESS_TOKEN = '...'`：引號內貼上步驟二的 Token。
6.  點擊右上角的 **「部署 (Deploy)」** -> **「新增部署 (New deployment)」**。
    *   **選取類型** (齒輪圖示)：選擇 **網頁應用程式 (Web app)**。
    *   **執行身分 (Execute as)**：選擇 **我 (Me)**。
    *   **誰可以存取 (Who has access)**：選擇 **任何人 (Anyone)** (一定要選這個！)。
7.  點擊「部署」。(如果是第一次，Google 會要求這授權，請點擊允許)。
8.  部署成功後，會給你一段 **網址 (Web App URL)**，請 **複製** 這段網址。

---

## 步驟四：連接起來！

### 1. 告訴 LINE 你的程式網址
1.  回到 [LINE Developers Console](https://developers.line.biz/) 的 **Messaging API** 分頁。
2.  找到 **Webhook settings**。
3.  在 Webhook URL 欄位貼上剛剛複製的 **網址 (Web App URL)**。
4.  點擊 **Update**，然後點擊 **Verify** (驗證)。如果顯示 Success 代表成功！
5.  開啟下方的 **Use webhook** 開關。

### 2. 告訴網頁你的程式網址
1.  開啟 **「教學進度_V8.3_公開版.html」**。
2.  點擊右上角的 **設定 (齒輪圖示)**。
3.  切換到 **系統 (System)** 分頁。
4.  在下方的 **「雲端同步設定」** 貼上同一個 **網址 (Web App URL)**。

---

## 完成！如何使用？

現在你可以試試看：

1.  **在 LINE 上面傳訊息** (記得把機器人加為好友)：
    格式：`學年, 班級, 科目, 進度`
    例如：
    > 114-1, 101班, 國文, 第一課
    > 114-2, 205班, 數學, 3-2習作, 記得帶圓規 (備註)

2.  **在網頁上同步**：
    點擊設定裡的 **「立即同步雲端資料」**，剛剛在 LINE 打的內容就會出現了！
    (如果該班級是新的，網頁會自動幫你建立班級卡片)

---

## 附錄：程式碼 (Google Apps Script)

```javascript
// --- 設定區 ---
// 1. 請填入步驟一的 Sheet ID
var SHEET_ID = '你的_SHEET_ID_貼在這裡'; 
// 2. 請填入步驟二的 LINE Token
var LINE_CHANNEL_ACCESS_TOKEN = '你的_LINE_Token_貼在這裡';

// --- 以下程式碼不用修改 ---

function doGet(e) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = data[i][j];
    }
    records.push(record);
  }
  return ContentService.createTextOutput(JSON.stringify(records)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var postData = JSON.parse(e.postData.contents);
  
  if (postData.action === 'add_record') {
    appendRecord(sheet, postData.record);
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (postData.events) {
    postData.events.forEach(function(event) {
      if (event.type === 'message' && event.message.type === 'text') {
        processLineMessage(sheet, event);
      }
    });
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({status: 'unknown'})).setMimeType(ContentService.MimeType.JSON);
}

function appendRecord(sheet, r) {
  if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'timestamp', 'year', 'date', 'className', 'subject', 'progress', 'homework', 'quiz', 'note']);
  sheet.appendRow([r.id || Date.now(), r.timestamp || new Date().toISOString(), r.year, r.date, r.className, r.subject, r.progress, r.homework || '', r.quiz || false, r.note || '']);
}

function processLineMessage(sheet, event) {
  var text = event.message.text;
  var replyToken = event.replyToken;
  var parts = text.split(/,|，/).map(function(s){ return s.trim(); });
  
  if (parts.length < 4) {
    replyLine(replyToken, '格式錯誤。請輸入：\n學年, 班級, 科目, 進度\n(例如: 114-1, 101班, 國文, 第一課)');
    return;
  }
  
  var record = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    year: parts[0],
    className: parts[1],
    subject: parts[2],
    progress: parts[3],
    homework: parts[4] || '',
    quiz: false,
    note: 'From LINE',
    date: parts[5] || new Date().toISOString().split('T')[0]
  };
  
  appendRecord(sheet, record);
  replyLine(replyToken, '✅ 已記錄：' + record.className + ' ' + record.subject + ' (' + record.progress + ')');
}

function replyLine(replyToken, message) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': [{ 'type': 'text', 'text': message }]
    }),
  });
}
```
