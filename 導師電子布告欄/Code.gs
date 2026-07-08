// ============================================================
//  班級電子佈告欄 — 後端（整合精簡版）v2.0 | 2026-07
//  真實資料流（三個檔對過的結論）：
//    讀取 = 前端 gviz 直讀「表單回應 2」（不經後端）
//    發布 = 前端 POST 到 Google 表單（不經後端）
//    隱藏 = 前端 POST 到本 Web App → doPost → handleUpdateStatus  ← 唯一用到後端的路徑
//  因此後端只保留 doGet + doPost(隱藏)。原本 bulletin 系列全數未被呼叫，已刪（鐵律 15：死碼＝攻擊面）
// ============================================================

const CONFIG = {
  SPREADSHEET_ID:      '1p2Ii2M8dOGdBffuLe0hvE40P6qmfj4SS55uQ4_9bQrQ',
  RESPONSE_SHEET_NAME: '表單回覆 2',   // ⚠️ 必須與前端 CONFIG.RESPONSE_SHEET 一字不差
  STATUS_COL:          8,               // H 欄 = 狀態（'隱藏' = 隱藏；留空 = 顯示）
  MARQUEE_COL:         9,               // I 欄 = 跑馬燈（'不跑馬燈' = 不跑馬燈；留空 = 跑馬燈）
  ADMIN_SECRET:        'a8b414c024b8',
  LOCK_TIMEOUT_MS:     30000,
};

// ── 回傳前端頁面 ──
// ⚠️ ALLOWALL 只在確定要被 iframe 內嵌（如 Google Sites）時開；否則改 DEFAULT（鐵律 17）
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'listSheets') {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheets = ss.getSheets().map(s => s.getName());
      return ContentService.createTextOutput(JSON.stringify({ success: true, sheets: sheets }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('高二甲班電子佈告欄')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  html.append(`<script>window.GAS_PARAMS = ${JSON.stringify(params)};</script>`);
  return html;
}

// ── 唯一寫入端點：處理「隱藏/顯示」與「跑馬燈設定」──
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'updateStatus') return handleUpdateStatus(body);
    if (body.action === 'updateMarquee') return handleUpdateMarquee(body);
    return jsonResponse({ success: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'PARSE_ERROR', detail: err.message });
  }
}

// ── 隱藏 / 顯示：對準前端讀的同一張表，用時間戳認列 ──
function handleUpdateStatus(body) {
  // ⚠️ adminSecret 寫在前端頁面裡＝任何人檢視原始碼都看得到，是「摩擦閘」不是「權限閘」。
  //    對班級佈告欄或許可接受，但別當成真的存取控制（要真防護見鐵律 16）。
  if (body.adminSecret !== CONFIG.ADMIN_SECRET) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED' });
  }

  const targetTime = new Date(body.timestamp).getTime();
  if (isNaN(targetTime)) return jsonResponse({ success: false, error: 'BAD_TIMESTAMP' });
  const cellValue = (body.status === 'hidden') ? '隱藏' : '';   // 中文值，導師可在表上手動改

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return jsonResponse({ success: false, error: 'LOCK_TIMEOUT' }); }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);   // ← 不再用猜的，直接對準前端那張
    if (!sheet) return jsonResponse({ success: false, error: 'RESPONSE_SHEET_NOT_FOUND' });

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResponse({ success: false, error: 'NO_DATA' });

    const times = sheet.getRange(2, 1, lastRow - 1, 1).getValues();   // A 欄 = 時間戳記
    for (let i = 0; i < times.length; i++) {
      const rowTime = new Date(times[i][0]).getTime();
      if (!isNaN(rowTime) && Math.abs(rowTime - targetTime) < 2000) { // 2 秒容錯（吸收秒以下誤差）
        sheet.getRange(i + 2, CONFIG.STATUS_COL).setValue(cellValue);
        SpreadsheetApp.flush();
        logSecurityEvent('STATUS_UPDATE', { timestamp: body.timestamp, status: cellValue || '顯示' });
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' });

  } finally { lock.releaseLock(); }
}

// ── 設定是否跑馬燈：寫入 I 欄 ──
function handleUpdateMarquee(body) {
  if (body.adminSecret !== CONFIG.ADMIN_SECRET) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED' });
  }

  const targetTime = new Date(body.timestamp).getTime();
  if (isNaN(targetTime)) return jsonResponse({ success: false, error: 'BAD_TIMESTAMP' });
  const cellValue = (body.marqueeStatus === 'no_marquee') ? '不跑馬燈' : ''; // 空為預設跑馬燈

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return jsonResponse({ success: false, error: 'LOCK_TIMEOUT' }); }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) return jsonResponse({ success: false, error: 'RESPONSE_SHEET_NOT_FOUND' });

    // 自動補齊跑馬燈欄位標頭
    const marqueeHeader = sheet.getRange(1, CONFIG.MARQUEE_COL);
    if (marqueeHeader.getValue() !== '跑馬燈') {
      marqueeHeader.setValue('跑馬燈');
      marqueeHeader.setNote('此欄由導師手動管理：留空 = 跑馬燈（預設），輸入「不跑馬燈」= 僅在公告欄顯示但不跑馬燈');
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResponse({ success: false, error: 'NO_DATA' });

    const times = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // A 欄 = 時間戳記
    for (let i = 0; i < times.length; i++) {
      const rowTime = new Date(times[i][0]).getTime();
      if (!isNaN(rowTime) && Math.abs(rowTime - targetTime) < 2000) { // 2 秒容錯
        sheet.getRange(i + 2, CONFIG.MARQUEE_COL).setValue(cellValue);
        SpreadsheetApp.flush();
        logSecurityEvent('MARQUEE_UPDATE', { timestamp: body.timestamp, status: cellValue || '跑馬燈' });
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' });

  } finally { lock.releaseLock(); }
}

// ── 工具 ──
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function logSecurityEvent(eventType, detail) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let logSheet = ss.getSheetByName('_SecurityLog');
    if (!logSheet) {
      logSheet = ss.insertSheet('_SecurityLog');
      logSheet.appendRow(['timestamp', 'event', 'detail']);
    }
    logSheet.appendRow([new Date().toISOString(), eventType, JSON.stringify(detail)]);
  } catch (e) {
    console.error('Log write failed:', e.message);   // 日誌失敗不影響主流程
  }
}
