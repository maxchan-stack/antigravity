/**
 * Google Apps Script Backend Code
 * Project: Student Grade Inquiry System V6.0 (MAXCHAN Security Edition)
 * Features: 5-Digit Code, Hardened Captcha, Global Rate Limit, Security Log, Admin Alert
 */

const CONFIG = {
    SHEET_PASSWORD_COL: 2,
    LOCKOUT_ATTEMPTS: 3,
    LOCKOUT_DURATION: 600,
    SESSION_TIMEOUT: 1800,

    // Global DDoS Protection (適用於 240 人規模)
    GLOBAL_FAIL_LIMIT: 120,      // Max global failures (240人 × 15%容錯 × 3倍緩衝)
    GLOBAL_WINDOW: 60,           // Window in seconds (1 minute)
    GLOBAL_PANIC_DURATION: 180,  // Lock system for 3 mins (縮短恢復時間)

    // Admin Alert
    ADMIN_EMAIL: 'maxgdodo@gmail.com', // <--- 請修改此處 (Enter Admin Email)

    // Time Limit (YYYY-MM-DD HH:mm) - Leave empty '' to disable
    SYSTEM_OPEN_TIME: '',   // e.g. '2026-01-19 08:00'
    SYSTEM_CLOSE_TIME: ''   // e.g. '2026-01-25 17:00'
};

function doGet(e) {
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
    const activeUser = Session.getActiveUser().getEmail();
    template.userEmail = activeUser ? activeUser : 'Anonymous (Public Mode)';

    return template.evaluate()
        .setTitle('物理科段考成績查詢系統')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const operators = ['+', '-', '×'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer;
    let finalNum1 = num1, finalNum2 = num2;

    if (operator === '-') {
        if (num1 < num2) { finalNum1 = num2; finalNum2 = num1; }
        answer = finalNum1 - finalNum2;
    } else if (operator === '×') {
        answer = finalNum1 * finalNum2;
    } else {
        answer = finalNum1 + finalNum2;
    }

    const token = Utilities.getUuid();
    CacheService.getUserCache().put('CAPTCHA_' + token, answer.toString(), 600);

    // Hardened SVG Generation
    let svgContent = '';
    const r = Math.floor(230 + Math.random() * 25);
    const g = Math.floor(230 + Math.random() * 25);
    const b = Math.floor(230 + Math.random() * 25);
    svgContent += `<rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>`;

    for (let i = 0; i < 8; i++) {
        const x1 = Math.random() * 150, y1 = Math.random() * 50;
        const x2 = Math.random() * 150, y2 = Math.random() * 50;
        const stroke = `rgba(${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)},0.3)`;
        svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${1 + Math.random()}"/>`;
    }

    const text = `${finalNum1} ${operator} ${finalNum2} = ?`;
    svgContent += `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="#333" letter-spacing="3" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${text}</text>`;

    for (let i = 0; i < 5; i++) {
        const x1 = Math.random() * 150, y1 = Math.random() * 50;
        const x2 = Math.random() * 150, y2 = Math.random() * 50;
        svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>`;
    }

    const svg = `<svg width="150" height="50" xmlns="http://www.w3.org/2000/svg" style="border-radius:4px; border:1px solid #ccc; overflow:hidden;">${svgContent}</svg>`;
    return { svg: svg, token: token };
}

function login(studentId, password, captchaToken, captchaAnswer, seatNumber, sessionId) {
    const cache = CacheService.getScriptCache();
    const userCache = CacheService.getUserCache();
    studentId = String(studentId).trim();
    sessionId = sessionId || 'NO-SESSION';  // 🆕 接收 Session ID

    // 🆕 Capture Real User Identity (Workspace Feature)
    const userEmail = Session.getActiveUser().getEmail();

    // 1. GLOBAL CIRCUIT BREAKER (DDoS Protection)
    if (cache.get('GLOBAL_PANIC')) {
        return { success: false, message: '⚠️ 系統偵測到異常流量，目前暫時限制登入。請 3 分鐘後再試。' };
    }

    // 2. Check Personal Lockout
    const lockKey = 'LOCK_' + studentId;
    const attemptKey = 'ATTEMPT_' + studentId;
    if (cache.get(lockKey)) {
        logSecurityEvent(studentId, 'LOGIN_BLOCKED', 'User is locked out', sessionId, userEmail);
        return { success: false, message: '錯誤次數過多，帳號已鎖定 10 分鐘。', locked: true };
    }

    // 3. Verify Captcha
    const realAnswer = userCache.get('CAPTCHA_' + captchaToken);
    if (!realAnswer || realAnswer !== captchaAnswer.toString().trim()) {
        monitorGlobalFails(cache);
        return { success: false, message: '驗證碼錯誤。' };
    }
    userCache.remove('CAPTCHA_' + captchaToken);

    try {
        const studentData = findStudentData(studentId);
        if (!studentData) {
            monitorGlobalFails(cache);
            const res = handleFailedAttempt(studentId, cache, attemptKey, lockKey, null, null, userEmail, sessionId);
            logSecurityEvent(studentId, 'LOGIN_FAIL', 'Student ID not found', sessionId, userEmail);
            return {
                success: false,
                message: res.message || (res.locked ? '帳號已鎖定。' : '學號或密碼錯誤。'),
                locked: res.locked,
                requireSeatNumber: res.requireSeatNumber
            };
        }

        if (studentData['查詢碼'] != password) {
            monitorGlobalFails(cache);

            // 🆕 座號驗證邏輯
            const attempts = Number(cache.get(attemptKey)) || 0;
            if (attempts >= 1 && seatNumber) {
                const seatValid = verifySeatNumber(studentId, seatNumber, studentData);
                if (!seatValid) {
                    cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
                    logSecurityEvent(studentId, 'MALICIOUS_LOCKOUT_ATTEMPT', 'Wrong seat number', sessionId, userEmail);
                    alertAdmin('🚨 惡意鎖定攻擊', `學號 ${studentId} 提供錯誤座號，已鎖定帳號。\n攻擊者: ${userEmail}`);
                    return {
                        success: false,
                        message: '座號驗證失敗，帳號已被鎖定以保護安全。',
                        locked: true
                    };
                }
            }

            const res = handleFailedAttempt(studentId, cache, attemptKey, lockKey, seatNumber, studentData, userEmail, sessionId);
            logSecurityEvent(studentId, 'LOGIN_FAIL', 'Wrong password', sessionId, userEmail);
            return {
                success: false,
                message: res.message || (res.locked ? '帳號已鎖定。' : '學號或密碼錯誤。'),
                locked: res.locked,
                requireSeatNumber: res.requireSeatNumber
            };
        }

        // Success - Format and return all grade data
        cache.remove(attemptKey);

        // 🆕 Format new grade fields with helper functions
        studentData['平時'] = formatScore(studentData['平時']);
        studentData['學期'] = formatScore(studentData['學期']);
        studentData['小考平均'] = formatScore(studentData['小考平均']);
        studentData['缺交'] = formatInteger(studentData['缺交']);

        // Format existing exam fields for consistency
        studentData['第一次段考'] = formatScore(studentData['第一次段考']);
        studentData['第二次段考'] = formatScore(studentData['第二次段考']);
        studentData['期末考'] = formatScore(studentData['期末考'] || studentData['第三次段考']);

        delete studentData['查詢碼'];
        delete studentData['座號'];  // 🆕 移除座號（隱私保護）
        logSecurityEvent(studentId, 'LOGIN_SUCCESS', 'Access granted', sessionId, userEmail);
        return { success: true, data: studentData };

    } catch (e) {
        Logger.log(e);
        return { success: false, message: '系統忙碌中 (Error: ' + e.message + ')' };
    }
}

function handleFailedAttempt(id, cache, attKey, lockKey, seatNumber, studentData, userEmail, sessionId) {
    let attempts = Number(cache.get(attKey)) || 0;
    attempts++;
    cache.put(attKey, attempts.toString(), CONFIG.LOCKOUT_DURATION);

    // 🆕 第 2 次失敗：要求座號驗證（防止惡意鎖定）
    if (attempts === 2) {
        return {
            locked: false,
            requireSeatNumber: true,
            message: '⚠️ 為了保護您的帳號安全，請輸入您的座號以繼續嘗試。'
        };
    }

    // 🆕 第 3-5 次失敗：漸進式延遲（座號驗證通過後才會到這裡）
    if (attempts === 3) {
        return {
            locked: false,
            waitSeconds: 10,
            message: '請等待 10 秒後再試。您還有 3 次機會。'
        };
    }
    if (attempts === 4) {
        return {
            locked: false,
            waitSeconds: 60,
            message: '請等待 1 分鐘後再試。您還有 2 次機會。'
        };
    }
    if (attempts === 5) {
        return {
            locked: false,
            waitSeconds: 300,
            message: '請等待 5 分鐘後再試。這是最後一次機會。'
        };
    }

    // 🆕 第 6 次失敗：完全鎖定
    const locked = attempts >= 6;
    if (locked) {
        cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
        logSecurityEvent(id, 'ACCOUNT_LOCKED', `Failed ${attempts} times (Progressive lockout)`, sessionId, userEmail);
        alertAdmin('帳號鎖定警報', `學號 ${id} 因連續錯誤 ${attempts} 次已被系統鎖定。\n操作者: ${userEmail}`);
    }
    return { locked: locked };
}

// 🆕 座號驗證函數
function verifySeatNumber(studentId, seatNumber, studentData) {
    if (!studentData) studentData = findStudentData(studentId);
    if (!studentData) return false;

    // 支援數字或字串格式
    const actualSeat = String(studentData['座號'] || '').trim();
    const providedSeat = String(seatNumber || '').trim();

    return actualSeat === providedSeat && actualSeat !== '';
}

function monitorGlobalFails(cache) {
    const k = 'GLOBAL_FAIL_COUNT';
    const current = (Number(cache.get(k)) || 0) + 1;
    cache.put(k, current.toString(), CONFIG.GLOBAL_WINDOW);

    if (current >= CONFIG.GLOBAL_FAIL_LIMIT) {
        if (!cache.get('GLOBAL_PANIC')) { // Alert only once per panic
            cache.put('GLOBAL_PANIC', 'TRUE', CONFIG.GLOBAL_PANIC_DURATION);
            logSecurityEvent('SYSTEM', 'GLOBAL_PANIC', `Traffic exceeded ${CONFIG.GLOBAL_FAIL_LIMIT}/min`, 'GLOBAL', 'SYSTEM');
            alertAdmin('🚨 系統全面封鎖警報 (DDoS防護)', `系統偵測到異常流量 (1分鐘內超過 ${CONFIG.GLOBAL_FAIL_LIMIT} 次失敗)。\n已啟動 3 分鐘全域封鎖模式。`);
        }
    }
}

// 🆕 Log Event to Sheet (Enhanced)
// 🆕 Log Event to Sheet (Enhanced with Real Identity)
function logSecurityEvent(studentId, type, detail, sessionId, userEmail) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('_SecurityLog');
        if (!sheet) {
            sheet = ss.insertSheet('_SecurityLog');
            sheet.appendRow(['Timestamp', 'Student ID', 'Type', 'Detail', 'Session ID', 'User Email']); // Added User Email
            sheet.setFrozenRows(1);
            sheet.setColumnWidth(1, 150); // Timestamp
            sheet.setColumnWidth(4, 250); // Detail
            sheet.setColumnWidth(6, 200); // Email
        }

        // Append row with email
        sheet.appendRow([new Date(), studentId, type, detail, sessionId || 'N/A', userEmail || 'N/A']);

        // Auto-trim logs > 1000 rows to save space
        if (sheet.getLastRow() > 1000) {
            sheet.deleteRows(2, 200);
        }
    } catch (e) { /* ignore log errors */ }
}

// 🆕 Send Email Alert
function alertAdmin(subject, body) {
    try {
        if (!CONFIG.ADMIN_EMAIL || !CONFIG.ADMIN_EMAIL.includes('@')) return;
        MailApp.sendEmail(CONFIG.ADMIN_EMAIL, '[成績查詢安全警報] ' + subject, body + '\n\n此為系統自動發送，請檢查 _SecurityLog。');
    } catch (e) {
        Logger.log('Email alert failed: ' + e.toString());
    }
}

// ==========================================
// Helper Functions for Grade Formatting
// ==========================================

/**
 * 格式化分數（處理空值、無效值，四捨五入至整數）
 * @param {*} value - 原始分數值
 * @returns {string} 格式化後的分數（無效時返回 '-'）
 */
function formatScore(value) {
    if (value === '' || value === null || value === undefined) return '-';
    const num = parseFloat(value);
    return isNaN(num) ? '-' : Math.round(num).toString();
}

/**
 * 格式化整數（用於缺交次數）
 * @param {*} value - 原始整數值
 * @returns {string} 格式化後的整數（無效時返回 '0'）
 */
function formatInteger(value) {
    if (value === '' || value === null || value === undefined) return '0';
    const num = parseInt(value);
    return isNaN(num) || num < 0 ? '0' : num.toString();
}

// ==========================================
// Core Data Logic
// ==========================================
function findStudentData(studentId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    let sheetIdx = -1, rowIdx = -1, rowData = null, headers = null;

    for (let i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().startsWith('_')) continue;
        const data = sheets[i].getDataRange().getValues();
        if (data.length < 2) continue;

        const h = data[0].map(x => String(x).trim());
        const idCol = h.indexOf('學號');
        if (idCol === -1) continue;

        for (let r = 1; r < data.length; r++) {
            if (String(data[r][idCol]) === String(studentId)) {
                sheetIdx = i; rowIdx = r; rowData = data[r]; headers = h;
                break;
            }
        }
        if (sheetIdx !== -1) break;
    }

    if (sheetIdx === -1) return null;

    const result = {
        sheetName: sheets[sheetIdx].getName(),
        rowIndex: rowIdx + 1,
        _stats: {},
        _debug: []
    };
    result._debug.push(`[System] Found student in sheet: ${result.sheetName}`);

    const valueMap = {};
    headers.forEach((h, i) => { valueMap[h] = rowData[i]; });

    const sheetVals = sheets[sheetIdx].getDataRange().getValues();

    headers.forEach((header, colIndex) => {
        let val = rowData[colIndex];
        result[header] = val;

        if (['學號', '姓名', '查詢碼', 'Email', '班級', '座號', '備註'].includes(header)) return;

        const scores = [];
        for (let r = 1; r < sheetVals.length; r++) {
            const s = parseFloat(sheetVals[r][colIndex]);
            if (!isNaN(s)) scores.push(s);
        }

        if (scores.length > 0) {
            const myScore = parseFloat(val);
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;

            scores.sort((a, b) => b - a);
            let rank = '-';
            if (!isNaN(myScore)) rank = scores.indexOf(myScore) + 1;

            let diff = null;
            const rules =
                [{ match: '二', replace: '一' }, { match: '三', replace: '二' }, { match: '四', replace: '三' },
                { match: '2', replace: '1' }, { match: '3', replace: '2' }, { match: '4', replace: '3' },
                // 🆕 期末考與第二次段考比較
                { match: '期末考', replace: '第二次段考' }];

            let prevHeader = null;
            for (let rule of rules) {
                if (header.includes(rule.match)) {
                    let potential = header.replace(rule.match, rule.replace);
                    if (valueMap.hasOwnProperty(potential)) {
                        prevHeader = potential; break;
                    }
                }
            }

            if (prevHeader) {
                const prevVal = parseFloat(valueMap[prevHeader]);
                if (!isNaN(myScore) && !isNaN(prevVal)) {
                    diff = parseFloat((myScore - prevVal).toFixed(1));
                    result._debug.push(`[Trend] ${header}: Current=${myScore}, Prev(${prevHeader})=${prevVal}, Diff=${diff}`);
                }
            }

            result._stats[header] = {
                avg: parseFloat(avg.toFixed(1)),
                rank: rank,
                diff: diff
            };
        }
    });

    return result;
}

// ==========================================
// Admin Menu
// ==========================================
function onOpen() {
    checkSheetPermissions();  // 🆕 自動檢查權限
    SpreadsheetApp.getUi().createMenu('管理選項')
        .addItem('產生所有查詢碼 (5碼)', 'generatePasswordsForAllSheets')
        .addItem('寄送查詢碼 (Email)', 'sendQueryCodesToStudents')
        .addSeparator()
        .addItem('📊 查看安全日誌', 'viewSecurityLog')
        .addItem('🔓 解除特定學號鎖定', 'unlockSpecificStudent')
        .addItem('⚠️ 緊急解除全部鎖定', 'emergencyUnlockAll')
        .addSeparator()
        .addItem('🔒 檢查試算表權限', 'checkSheetPermissions')
        .addSeparator()
        .addItem('📱 產生專案分享圖卡 (給老師)', 'showInstructionCard')
        .addToUi();
}

function generatePasswordsForAllSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let count = 0;
    ss.getSheets().forEach(s => {
        if (s.getName().startsWith('_')) return;
        const d = s.getDataRange().getValues();
        if (d.length < 2) return;
        const h = d[0];
        let pIdx = h.indexOf('查詢碼');
        if (pIdx === -1) { pIdx = h.length; s.getRange(1, pIdx + 1).setValue('查詢碼'); }

        const vals = [];
        for (let i = 1; i < d.length; i++) {
            let v = d[i][pIdx];
            if (!v) { v = Math.floor(10000 + Math.random() * 90000); count++; }
            vals.push([v]);
        }
        if (vals.length > 0) s.getRange(2, pIdx + 1, vals.length, 1).setValues(vals);
    });
    Browser.msgBox('已更新 ' + count + ' 筆');
}

function sendQueryCodesToStudents() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();

    // 🆕 手動詢問網址，確保正確
    const response = ui.prompt(
        '寄送查詢碼',
        '請貼上您的「網頁應用程式網址」：\n(可在「部署」>「管理部署作業」中複製)',
        ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() != ui.Button.OK) return;

    const webAppUrl = response.getResponseText().trim();
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
        ui.alert('❌ 網址格式錯誤，取消寄送。');
        return;
    }

    let c = 0;
    let errors = [];

    ss.getSheets().forEach(s => {
        if (s.getName().startsWith('_')) return;
        const d = s.getDataRange().getValues();
        if (d.length < 1) return; // Empty sheet check

        const h = d[0];
        const eIdx = h.indexOf('Email'), cIdx = h.indexOf('查詢碼'), iIdx = h.indexOf('學號');

        // 🆕 檢查欄位是否存在
        if (eIdx < 0) {
            errors.push(`工作表「${s.getName()}」缺少 Email 欄位`);
            return;
        }
        if (cIdx < 0) {
            errors.push(`工作表「${s.getName()}」缺少 查詢碼 欄位`);
            return;
        }

        for (let i = 1; i < d.length; i++) {
            const row = d[i];
            const em = row[eIdx];
            if (em && String(em).includes('@') && row[cIdx]) {
                try {
                    // 使用手動輸入的正確網址
                    MailApp.sendEmail(em, '成績查詢碼', `學號:${row[iIdx]}\n查詢碼:${row[cIdx]}\n查詢網址: ${webAppUrl}`);
                    c++;
                } catch (e) {
                    // 🆕 詳細記錄錯誤
                    errors.push(`寄送失敗 (學號: ${row[iIdx]}, Email: ${em}): ${e.message}`);
                }
            }
        }
    });

    // 🆕 顯示詳細結果
    let message = `✅ 成功寄送 ${c} 封`;
    if (errors.length > 0) {
        message += '\n\n⚠️ 錯誤訊息：\n' + errors.slice(0, 5).join('\n');
        if (errors.length > 5) {
            message += `\n...(還有 ${errors.length - 5} 個錯誤)`;
        }
    }
    Browser.msgBox(message);
}

function viewSecurityLog() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const s = ss.getSheetByName('_SecurityLog');
    if (s) {
        s.activate();
        Browser.msgBox('已切換至 _SecurityLog 工作表');
    } else {
        Browser.msgBox('尚無安全日誌 (_SecurityLog)');
    }
}

// 🆕 解除特定學號鎖定
function unlockSpecificStudent() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('解除鎖定', '請輸入要解鎖的學號：', ui.ButtonSet.OK_CANCEL);

    if (response.getSelectedButton() == ui.Button.OK) {
        const studentId = response.getResponseText().trim();
        const cache = CacheService.getScriptCache();
        cache.remove('LOCK_' + studentId);
        cache.remove('ATTEMPT_' + studentId);
        logSecurityEvent(studentId, 'ADMIN_UNLOCK', 'Unlocked by administrator', 'ADMIN_ACTION', Session.getActiveUser().getEmail());
        ui.alert(`學號 ${studentId} 已解除鎖定。`);
    }
}

// 🆕 緊急解除全部鎖定
function emergencyUnlockAll() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        '緊急操作',
        '確定要解除所有學生的鎖定嗎？\n\n此功能僅用於遭受大規模惡意攻擊時使用。',
        ui.ButtonSet.YES_NO
    );

    if (response == ui.Button.YES) {
        logSecurityEvent('ADMIN', 'EMERGENCY_UNLOCK_ALL', 'Admin requested global unlock', 'ADMIN_ACTION', Session.getActiveUser().getEmail());
        ui.alert('已記錄解鎖請求。\n\n舊的鎖定記錄將在 10 分鐘後自動過期。\n建議：檢查 _SecurityLog 確認攻擊來源。');
    }
}


// 🆕 Google Sheet 權限安全檢查
function checkSheetPermissions() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ui = SpreadsheetApp.getUi();

        const sharingAccess = ss.getSharingAccess();
        const editors = ss.getEditors();
        const viewers = ss.getViewers();

        let warningMessage = '';
        let isSecure = true;

        if (sharingAccess === SpreadsheetApp.Access.ANYONE ||
            sharingAccess === SpreadsheetApp.Access.ANYONE_WITH_LINK) {
            isSecure = false;
            warningMessage += '⚠️ 危險！試算表目前為「公開分享」狀態！\n\n';
            warningMessage += '任何知道連結的人都可以查看您的成績資料！\n\n';
        }

        if (editors.length > 5) {
            warningMessage += '⚠️ 提醒：您的試算表有 ' + editors.length + ' 個編輯者。\n';
            warningMessage += '建議僅保留必要的管理員權限。\n\n';
        }

        if (viewers.length > 0) {
            warningMessage += '👁️ 提醒：有 ' + viewers.length + ' 人可以觀看此試算表。\n';
            warningMessage += '如果他們不需要存取，請移除權限。\n\n';
        }

        if (!isSecure) {
            warningMessage += '🔧 如何修正？\n';
            warningMessage += '1. 點選右上角「共用」按鈕\n';
            warningMessage += '2. 將「一般存取權」改為「限制存取」\n';
            warningMessage += '3. 確認僅有您可以編輯\n\n';
            warningMessage += '⚠️ 這非常重要！否則所有學生成績都可能被他人查看！';

            ui.alert('🚨 安全警告', warningMessage, ui.ButtonSet.OK);
            logSecurityEvent('ADMIN', 'INSECURE_SHEET_DETECTED', 'Sharing: ' + sharingAccess, 'SYSTEM_CHECK', Session.getActiveUser().getEmail());
        } else if (warningMessage) {
            let statusMessage = '✅ 您的試算表權限設定安全！\n\n';
            statusMessage += '🔒 分享狀態：限制存取\n';
            statusMessage += '👥 編輯者：' + editors.length + ' 人\n';
            statusMessage += '👁️ 觀看者：' + viewers.length + ' 人\n\n';
            statusMessage += warningMessage;
            ui.alert('✅ 權限檢查結果', statusMessage, ui.ButtonSet.OK);
        }

    } catch (e) {
        Logger.log('Permission check error: ' + e.toString());
    }
}

// 🆕 顯示專案分享圖卡 (給老師)
function showInstructionCard() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.prompt(
        '產生專案分享圖卡',
        '請輸入您的「教學文件或專案網址」：\n(例如 Google Doc 教學連結)',
        ui.ButtonSet.OK_CANCEL
    );

    if (result.getSelectedButton() == ui.Button.OK) {
        const url = result.getResponseText().trim();
        if (!url || !url.startsWith('http')) {
            ui.alert('❌ 網址格式錯誤，請重新輸入。');
            return;
        }

        // 使用 goqr.me API (更穩定)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

        const html = `
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f7; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card {
                    background: white; width: 380px; padding: 30px; border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center;
                    border: 1px solid #e0e0e0;
                }
                .header { margin-bottom: 20px; }
                .header h2 { margin: 0; color: #1d1d1f; font-size: 24px; font-weight: 700; }
                .header p { margin: 5px 0 0; color: #86868b; font-size: 14px; }
                
                .qr-container {
                    background: #fff; padding: 10px; border-radius: 12px;
                    border: 2px solid #98694c; display: inline-block; margin: 20px 0;
                }
                .qr-img { display: block; width: 200px; height: 200px; }
                
                .steps { text-align: left; background: #fbfbfd; padding: 15px; border-radius: 12px; margin-top: 20px; }
                .step { display: flex; align-items: start; margin-bottom: 10px; color: #424245; font-size: 14px; line-height: 1.4; }
                .step-num { 
                    background: #98694c; color: white; width: 22px; height: 22px; border-radius: 50%; 
                    text-align: center; line-height: 22px; font-size: 12px; margin-right: 10px; flex-shrink: 0;
                }
                
                .theme-strip { height: 6px; background: linear-gradient(90deg, #98694c 0%, #86754d 50%, #41464b 100%); margin-top: -30px; margin-bottom: 30px; border-radius: 20px 20px 0 0; margin-left: -30px; margin-right: -30px; }
            </style>
            <div class="card">
                <div class="theme-strip"></div>
                <div class="header">
                    <h2>校園成績查詢系統</h2>
                    <p>Open Source Project</p>
                </div>
                
                <div class="qr-container">
                    <img src="${qrUrl}" class="qr-img" alt="Scan QR Code">
                </div>
                
                <div class="steps">
                    <div class="step"><div class="step-num">1</div>掃描 QR Code 取得專案教學</div>
                    <div class="step"><div class="step-num">2</div>依照說明建立自己的成績查詢系統</div>
                    <div class="step"><div class="step-num">3</div>完全免費、安全且開源</div>
                </div>
            </div>
        `;

        const userInterface = HtmlService.createHtmlOutput(html)
            .setWidth(450)
            .setHeight(650);

        ui.showModalDialog(userInterface, '📱 教師專用分享圖卡 (請截圖)');
    }
}
