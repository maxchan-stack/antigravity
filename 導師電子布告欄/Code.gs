// ============================================================
//  班級電子佈告欄 — 後端 v2.1 | 2026-07-18
//  讀取：前端 gviz 直讀「表單回覆 2」／config（並可走 getPublicConfig）
//  寫入：前端 POST 本 Web App（發布／隱藏／編輯／跑馬燈／連結／倒數／PIN）
// ============================================================

const CONFIG = {
  SPREADSHEET_ID:      '1p2Ii2M8dOGdBffuLe0hvE40P6qmfj4SS55uQ4_9bQrQ',
  RESPONSE_SHEET_NAME: '表單回覆 2',   // ⚠️ 必須與前端 CONFIG.RESPONSE_SHEET 一字不差
  STATUS_COL:          8,               // H 欄 = 狀態（'隱藏' = 隱藏；留空 = 顯示）
  MARQUEE_COL:         9,               // I 欄 = 跑馬燈
  ID_COL:              10,              // J 欄 = 公告ID（穩定定位，優先於時間戳）
  ADMIN_SECRET:        'a8b414c024b8',
  LOCK_TIMEOUT_MS:     30000,
};

// ── 讀取端點 ──
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  // 公開設定（不含 PIN）— 給前端避開 gviz 快取
  if (params.action === 'getPublicConfig') {
    return jsonResponse(handleGetPublicConfig());
  }

  if (params.action === 'listSheets') {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheets = ss.getSheets().map(s => s.getName());
      return jsonResponse({ success: true, sheets: sheets });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message });
    }
  }

  // GET 備援 API：部分環境 POST 會 405/被擋
  if (params.action === 'api' && params.payload) {
    try {
      const body = JSON.parse(params.payload);
      return routeApiAction(body);
    } catch (err) {
      return jsonResponse({ success: false, error: 'PARSE_ERROR', detail: err.message });
    }
  }

  if (params.action === 'verifyPin') {
    return jsonResponse(handleVerifyPin({ pin: params.pin }));
  }
  if (params.action === 'verifyAdmin') {
    return jsonResponse(handleVerifyAdmin({ adminSecret: params.adminSecret }));
  }

  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('高二甲班電子佈告欄')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  html.append(`<script>window.GAS_PARAMS = ${JSON.stringify(params)};</script>`);
  return html;
}

// ── 寫入端點 ──
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return routeApiAction(body);
  } catch (err) {
    return jsonResponse({ success: false, error: 'PARSE_ERROR', detail: err.message });
  }
}

/** 統一路由 POST / GET-api（回傳 ContentService） */
function routeApiAction(body) {
  return jsonResponse(routeApiActionRaw(body));
}

/**
 * 純物件路由 — 供 google.script.run 直接呼叫（HtmlService 內嵌時不需 HTTP）
 * 前端：google.script.run.routeApiActionRaw(body)
 */
function routeApiActionRaw(body) {
  try {
    if (!body || !body.action) return { success: false, error: 'UNKNOWN_ACTION' };
    // 各 handle* 目前回傳 ContentService；改為內部先拿物件
    const out = dispatchAction(body);
    // 若誤回 ContentService，無法在 run 裡用；dispatch 保證物件
    return out;
  } catch (err) {
    return { success: false, error: 'SYSTEM_ERROR', detail: String(err.message || err) };
  }
}

function dispatchAction(body) {
  switch (body.action) {
    case 'verifyAdmin': return handleVerifyAdmin(body);
    case 'publishAnnouncement': return handlePublishAnnouncement(body);
    case 'updateStatus': return handleUpdateStatus(body);
    case 'updateMarquee': return handleUpdateMarquee(body);
    case 'editAnnouncement': return handleEditAnnouncement(body);
    case 'updateCountdown': return handleUpdateCountdown(body);
    case 'updateLinks': return handleUpdateLinks(body);
    case 'verifyPin': return handleVerifyPin(body);
    case 'getPin': return handleGetPin(body);
    case 'updatePin': return handleUpdatePin(body);
    default: return { success: false, error: 'UNKNOWN_ACTION' };
  }
}

// ── 工具 ──
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function isAdminSecret(secret) {
  return secret && String(secret) === CONFIG.ADMIN_SECRET;
}

function normalizeCategory(cat) {
  const c = String(cat || '').trim();
  if (c === '交代事項') return '老師交代事項';
  return c;
}

function ensureResponseHeaders(sheet) {
  // H / I / J 標頭固定，避免顯示「第 1 欄」造成導師手改困難
  const h = sheet.getRange(1, CONFIG.STATUS_COL);
  if (String(h.getValue()).trim() !== '狀態') {
    h.setValue('狀態');
    h.setNote('留空 = 顯示；填「隱藏」= 不在佈告欄顯示');
  }
  const i = sheet.getRange(1, CONFIG.MARQUEE_COL);
  if (String(i.getValue()).trim() !== '跑馬燈') {
    i.setValue('跑馬燈');
    i.setNote('留空 = 跑馬燈（預設）；填「不跑馬燈」= 僅列表顯示');
  }
  const j = sheet.getRange(1, CONFIG.ID_COL);
  if (String(j.getValue()).trim() !== '公告ID') {
    j.setValue('公告ID');
    j.setNote('系統自動產生，請勿手動修改。用於精確編輯／隱藏。');
  }
}

/**
 * 以公告ID 優先、時間戳後備，回傳試算表列號（1-based），找不到回 -1
 */
function findResponseRow(sheet, body) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const numData = lastRow - 1;
  // 一次讀 A..J，避免多次 getRange
  const data = sheet.getRange(2, 1, numData, CONFIG.ID_COL).getValues();
  const rowId = body.rowId ? String(body.rowId).trim() : '';

  if (rowId) {
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][CONFIG.ID_COL - 1] || '').trim() === rowId) {
        return i + 2;
      }
    }
  }

  // 後備：時間戳（容錯 2 秒，相容舊資料）
  const targetTime = new Date(body.timestamp).getTime();
  if (isNaN(targetTime)) return -1;

  for (let i = 0; i < data.length; i++) {
    const rowTime = new Date(data[i][0]).getTime();
    if (!isNaN(rowTime) && Math.abs(rowTime - targetTime) < 2000) {
      return i + 2;
    }
  }
  return -1;
}

function handleVerifyAdmin(body) {
  if (isAdminSecret(body.adminSecret)) {
    logSecurityEvent('ADMIN_VERIFY_OK', {});
    return { success: true };
  }
  logSecurityEvent('ADMIN_VERIFY_FAIL', {});
  return { success: false, error: 'UNAUTHORIZED' };
}

function handleGetPublicConfig() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('config');
    if (!configSheet) return { success: true, config: {} };

    const rows = configSheet.getDataRange().getValues();
    const config = {};
    for (let i = 0; i < rows.length; i++) {
      const key = String(rows[i][0] == null ? '' : rows[i][0]).toLowerCase().trim();
      if (!key || key === 'pin' || key === 'key') continue;
      if (/^\d+$/.test(key)) continue; // 避免把裸 PIN 當 key
      const val = rows[i][1] == null ? '' : String(rows[i][1]).trim();
      config[key] = val;
    }
    return {
      success: true,
      config: config,
      fetchedAt: new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: 'SYSTEM_ERROR', detail: e.message };
  }
}

function handleVerifyPin(body) {
  const isValid = verifyPinInBackend(body.pin);
  return { success: isValid };
}

function handleUpdateStatus(body) {
  const isAdmin = isAdminSecret(body.adminSecret);
  const isUser = verifyPinInBackend(body.pin);

  if (!isAdmin && !isUser) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const cellValue = (body.status === 'hidden') ? '隱藏' : '';

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'RESPONSE_SHEET_NOT_FOUND' };

    ensureResponseHeaders(sheet);
    const row = findResponseRow(sheet, body);
    if (row === -1) return { success: false, error: 'RECORD_NOT_FOUND' };

    if (!isAdmin) {
      const originalPoster = String(sheet.getRange(row, 6).getValue()).trim();
      if (originalPoster !== String(body.posterName || '').trim()) {
        return { success: false, error: 'FORBIDDEN_NOT_YOUR_POST' };
      }
    }

    sheet.getRange(row, CONFIG.STATUS_COL).setValue(cellValue);
    SpreadsheetApp.flush();
    logSecurityEvent('STATUS_UPDATE', {
      rowId: body.rowId || '',
      timestamp: body.timestamp,
      status: cellValue || '顯示'
    });
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateMarquee(body) {
  if (!isAdminSecret(body.adminSecret)) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const cellValue = (body.marqueeStatus === 'no_marquee') ? '不跑馬燈' : '';

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'RESPONSE_SHEET_NOT_FOUND' };

    ensureResponseHeaders(sheet);
    const row = findResponseRow(sheet, body);
    if (row === -1) return { success: false, error: 'RECORD_NOT_FOUND' };

    sheet.getRange(row, CONFIG.MARQUEE_COL).setValue(cellValue);
    SpreadsheetApp.flush();
    logSecurityEvent('MARQUEE_UPDATE', {
      rowId: body.rowId || '',
      timestamp: body.timestamp,
      status: cellValue || '跑馬燈'
    });
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function logSecurityEvent(eventType, detail) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let logSheet = ss.getSheetByName('_SecurityLog');
    if (!logSheet) {
      logSheet = ss.insertSheet('_SecurityLog');
      logSheet.appendRow(['timestamp', 'event', 'detail']);
    }
    logSheet.appendRow([new Date().toISOString(), eventType, JSON.stringify(detail || {})]);
  } catch (e) {
    console.error('Log write failed:', e.message);
  }
}

function handlePublishAnnouncement(body) {
  const isAdmin = isAdminSecret(body.adminSecret);
  const isUser = verifyPinInBackend(body.pin);

  if (!isAdmin && !isUser) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  if (!body.category || !body.subject || !body.dueDate || !body.content) {
    return { success: false, error: 'MISSING_FIELDS' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'RESPONSE_SHEET_NOT_FOUND' };

    ensureResponseHeaders(sheet);

    const timestamp = new Date();
    const rowId = Utilities.getUuid();
    const category = normalizeCategory(body.category);

    // A..J：時間戳、類別、科目、截止、內容、發布者、角色、狀態、跑馬燈、公告ID
    const newRow = [
      timestamp,
      category,
      body.subject,
      body.dueDate,
      body.content,
      body.posterName || '',
      body.posterType || '',
      '',
      '',
      rowId
    ];

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    logSecurityEvent('ANNOUNCEMENT_PUBLISH', {
      category: category,
      subject: body.subject,
      posterName: body.posterName,
      posterType: body.posterType,
      rowId: rowId
    });

    return { success: true, rowId: rowId, timestamp: timestamp.toISOString() };
  } catch (err) {
    return { success: false, error: 'WRITE_ERROR', detail: err.message };
  } finally {
    lock.releaseLock();
  }
}

function handleEditAnnouncement(body) {
  const isAdmin = isAdminSecret(body.adminSecret);
  const isUser = verifyPinInBackend(body.pin);

  if (!isAdmin && !isUser) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'RESPONSE_SHEET_NOT_FOUND' };

    ensureResponseHeaders(sheet);
    const row = findResponseRow(sheet, body);
    if (row === -1) return { success: false, error: 'RECORD_NOT_FOUND' };

    if (!isAdmin) {
      const originalPoster = String(sheet.getRange(row, 6).getValue()).trim();
      if (originalPoster !== String(body.posterName || '').trim()) {
        return { success: false, error: 'FORBIDDEN_NOT_YOUR_POST' };
      }
    }

    const category = normalizeCategory(body.category);
    sheet.getRange(row, 2).setValue(category);
    sheet.getRange(row, 3).setValue(body.subject);
    sheet.getRange(row, 4).setValue(body.dueDate);
    sheet.getRange(row, 5).setValue(body.content);

    // 舊列若無公告ID，補上
    const existingId = String(sheet.getRange(row, CONFIG.ID_COL).getValue() || '').trim();
    if (!existingId) {
      sheet.getRange(row, CONFIG.ID_COL).setValue(Utilities.getUuid());
    }

    SpreadsheetApp.flush();
    logSecurityEvent('ANNOUNCEMENT_EDIT', {
      rowId: body.rowId || existingId,
      timestamp: body.timestamp,
      category: category
    });
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function verifyPinInBackend(pin) {
  if (!pin) return false;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('config');
    if (!configSheet) return false;
    const rows = configSheet.getDataRange().getValues();

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === 'pin') {
        return String(rows[i][1]).trim() === String(pin).trim();
      }
    }

    if (rows.length > 0) {
      const val1 = String(rows[0][0]).trim();
      if (val1 && /^\d+$/.test(val1)) {
        return val1 === String(pin).trim();
      }
    }
  } catch (e) {
    console.error('verifyPinInBackend error:', e.message);
  }
  return false;
}

function handleUpdateCountdown(body) {
  if (!isAdminSecret(body.adminSecret)) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('config');
    if (!configSheet) return { success: false, error: 'CONFIG_SHEET_NOT_FOUND' };

    let rows = configSheet.getDataRange().getValues();
    updateConfigKeyInBackend(configSheet, rows, 'countdown_title', body.title);
    rows = configSheet.getDataRange().getValues();
    updateConfigKeyInBackend(configSheet, rows, 'countdown_date', body.date);

    SpreadsheetApp.flush();
    logSecurityEvent('COUNTDOWN_UPDATE', { title: body.title, date: body.date });
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateLinks(body) {
  if (!isAdminSecret(body.adminSecret)) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('config');
    if (!configSheet) return { success: false, error: 'CONFIG_SHEET_NOT_FOUND' };

    let rows = configSheet.getDataRange().getValues();
    for (let i = 1; i <= 4; i++) {
      updateConfigKeyInBackend(configSheet, rows, `link_${i}_title`, body[`title${i}`]);
      rows = configSheet.getDataRange().getValues();
      updateConfigKeyInBackend(configSheet, rows, `link_${i}_url`, body[`url${i}`]);
      rows = configSheet.getDataRange().getValues();
    }

    SpreadsheetApp.flush();
    logSecurityEvent('LINKS_UPDATE', { status: 'success' });
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function updateConfigKeyInBackend(sheet, rows, key, value) {
  const safeVal = (value === null || value === undefined) ? '' : String(value).trim();
  let rowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase().trim() === key) {
      rowIdx = i + 1;
      break;
    }
  }
  if (rowIdx === -1) {
    if (safeVal === '') return;
    sheet.appendRow([key, safeVal]);
  } else {
    sheet.getRange(rowIdx, 2).setValue(safeVal);
  }
}

function handleGetPin(body) {
  if (!isAdminSecret(body.adminSecret)) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('config');
    if (!configSheet) {
      return { success: true, pin: '', warning: 'CONFIG_MISSING' };
    }
    const rows = configSheet.getDataRange().getValues();

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === 'pin') {
        const pin = String(rows[i][1]).trim();
        const weak = pin === '1234' || pin.length < 4;
        return { success: true, pin: pin, weak: weak };
      }
    }

    if (rows.length > 0) {
      const val1 = String(rows[0][0]).trim();
      if (val1 && /^\d+$/.test(val1)) {
        return { success: true, pin: val1, weak: val1 === '1234' || val1.length < 4 };
      }
    }

    return { success: true, pin: '', warning: 'PIN_NOT_SET' };
  } catch (e) {
    return { success: false, error: 'SYSTEM_ERROR', detail: e.message };
  }
}

function handleUpdatePin(body) {
  if (!isAdminSecret(body.adminSecret)) {
    return { success: false, error: 'UNAUTHORIZED' };
  }
  // 至少 4 位數字，禁止 1234
  if (!body.newPin || !/^\d{4,8}$/.test(body.newPin)) {
    return { success: false, error: 'BAD_PIN_FORMAT', detail: '請使用 4–8 位數字' };
  }
  if (String(body.newPin) === '1234') {
    return { success: false, error: 'WEAK_PIN', detail: '不可使用 1234' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.LOCK_TIMEOUT_MS); }
  catch (e) { return { success: false, error: 'LOCK_TIMEOUT' }; }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let configSheet = ss.getSheetByName('config');

    if (!configSheet) {
      configSheet = ss.insertSheet('config');
      configSheet.getRange('A1:B1').setValues([['key', 'value']]);
      configSheet.getRange('A2:B2').setValues([['pin', body.newPin]]);
      SpreadsheetApp.flush();
      logSecurityEvent('PIN_UPDATE', {});
      return { success: true };
    }

    const rows = configSheet.getDataRange().getValues();

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === 'pin') {
        configSheet.getRange(i + 1, 2).setValue(body.newPin);
        SpreadsheetApp.flush();
        logSecurityEvent('PIN_UPDATE', {});
        return { success: true };
      }
    }

    if (rows.length > 0) {
      const val1 = String(rows[0][0]).trim();
      if (val1 && /^\d+$/.test(val1)) {
        configSheet.getRange(1, 1).setValue('pin');
        configSheet.getRange(1, 2).setValue(body.newPin);
        SpreadsheetApp.flush();
        logSecurityEvent('PIN_UPDATE', {});
        return { success: true };
      }
    }

    configSheet.appendRow(['pin', body.newPin]);
    SpreadsheetApp.flush();
    logSecurityEvent('PIN_UPDATE', {});
    return { success: true };
  } catch (e) {
    return { success: false, error: 'SYSTEM_ERROR', detail: e.message };
  } finally {
    lock.releaseLock();
  }
}
