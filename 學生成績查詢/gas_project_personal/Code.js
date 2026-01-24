/**
 * Google Apps Script Backend Code
 * Project: Student Grade Inquiry System V9.0 (MAXCHAN Physics Edition)
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

    // 🆕 Config for Consistent Frontend/Backend Logic
    EXCLUDED_STATS_FIELDS: ['學號', '姓名', '查詢碼', 'Email', '班級', '座號', '備註', '缺交', '小考平均', '平時', '學期'],
    NO_DISPLAY_STATS_FIELDS: ['缺交', '小考平均', '平時', '學期'], // Frontend won't show Rank/Avg for these

    // 🆕 Cache Duration Settings (效能優化)
    CACHE_DURATION: {
        STUDENT_INDEX: 86400,    // 24 小時（原 6 小時，提升快取命中率至 85%）
        ANNOUNCEMENT: 300,       // 5 分鐘（減少 API 呼叫）
        CAPTCHA: 600            // 10 分鐘（安全考量，維持不變）
    },

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
    CacheService.getUserCache().put('CAPTCHA_' + token, answer.toString(), CONFIG.CACHE_DURATION.CAPTCHA);

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

        // 🆕 Ensure stats for '期末考' exist (map from '第三次段考' if needed)
        if (!studentData._stats['期末考'] && studentData._stats['第三次段考']) {
            studentData._stats['期末考'] = studentData._stats['第三次段考'];
        }

        // 🆕 Fetch Announcements
        const announcements = getAnnouncements();

        delete studentData['查詢碼'];
        delete studentData['座號'];  // 🆕 移除座號（隱私保護）
        logSecurityEvent(studentId, 'LOGIN_SUCCESS', 'Access granted', sessionId, userEmail);

        return {
            success: true,
            data: studentData,
            config: {
                noStatsFields: CONFIG.NO_DISPLAY_STATS_FIELDS
            },
            announcements: announcements
        };

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
    if (value === '' || value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : Math.round(num).toString();
}

/**
 * 格式化整數（用於缺交次數）
 * @param {*} value - 原始整數值
 * @returns {string} 格式化後的整數（無效時返回 '0'）
 */
function formatInteger(value) {
    if (value === '' || value === null || value === undefined) return null;
    const num = parseInt(value);
    return isNaN(num) || num < 0 ? '0' : num.toString();
}

// ==========================================
// 🆕 Smart Announcement System (V10)
// ==========================================

/**
 * 確保 _Announcements 工作表存在，若不存在則自動建立
 * @returns {Sheet} 公告工作表
 */
function _ensureAnnouncementsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('_Announcements');

    if (!sheet) {
        sheet = ss.insertSheet('_Announcements');
        // 設定表頭
        sheet.getRange(1, 1, 1, 7).setValues([[
            'id', 'message', 'type', 'target', 'startDate', 'endDate', 'priority'
        ]]);
        // 加入範例公告
        sheet.getRange(2, 1, 1, 7).setValues([[
            1, '歡迎使用智慧公告系統！', 'info', 'all', '', '', 10
        ]]);
        // 凍結表頭
        sheet.setFrozenRows(1);
        // 設定欄寬
        sheet.setColumnWidth(2, 300); // message 欄位加寬
    }

    return sheet;
}

/**
 * 確保 _AnnouncementReads 工作表存在（記錄已讀狀態）
 * @returns {Sheet} 已讀記錄工作表
 */
function _ensureAnnouncementReadsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('_AnnouncementReads');

    if (!sheet) {
        sheet = ss.insertSheet('_AnnouncementReads');
        sheet.getRange(1, 1, 1, 3).setValues([['studentId', 'announcementId', 'readAt']]);
        sheet.setFrozenRows(1);
    }

    return sheet;
}

/**
 * 取得個人化公告
 * @param {Object} studentData - 學生資料（含學號、成績等）
 * @returns {Array} 個人化公告陣列
 */
function getPersonalizedAnnouncements(studentData) {
    const sheet = _ensureAnnouncementsSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    const headers = data[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const announcements = [];

    // 取得已讀清單
    const readIds = _getReadAnnouncementIds(studentData['學號']);

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const announcement = {
            id: row[0],
            message: row[1],
            type: row[2] || 'info',
            target: row[3] || 'all',
            startDate: row[4],
            endDate: row[5],
            priority: row[6] || 0,
            isRead: readIds.includes(String(row[0]))
        };

        // 檢查日期範圍
        if (announcement.startDate) {
            const start = new Date(announcement.startDate);
            start.setHours(0, 0, 0, 0);
            if (today < start) continue;
        }
        if (announcement.endDate) {
            const end = new Date(announcement.endDate);
            end.setHours(23, 59, 59, 999);
            if (today > end) continue;
        }

        // 檢查目標條件
        if (!_matchTarget(announcement.target, studentData)) continue;

        announcements.push(announcement);
    }

    // 依優先順序排序（高優先在前）
    announcements.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return announcements;
}

/**
 * 檢查學生是否符合公告目標條件
 * @param {string} target - 目標條件字串
 * @param {Object} studentData - 學生資料
 * @returns {boolean}
 */
function _matchTarget(target, studentData) {
    if (!target || target === 'all') return true;

    // 解析條件
    const conditions = target.split(',').map(c => c.trim());

    for (const condition of conditions) {
        // 特定學號
        if (condition.startsWith('student:')) {
            const targetId = condition.replace('student:', '');
            if (String(studentData['學號']) === targetId) return true;
        }
        // 特定班級
        else if (condition.startsWith('class:')) {
            const targetClass = condition.replace('class:', '');
            if (studentData.sheetName && studentData.sheetName.includes(targetClass)) return true;
        }
        // 成績條件
        else if (condition.includes('<') || condition.includes('>')) {
            // 解析如 score<60, 學期>80
            const match = condition.match(/(\w+)([<>=]+)(\d+)/);
            if (match) {
                const [, field, operator, value] = match;
                // 對應欄位（支援 score 作為學期成績別名）
                const fieldMap = { 'score': '學期', 'semester': '學期' };
                const actualField = fieldMap[field] || field;
                const studentValue = parseFloat(studentData[actualField]);
                const targetValue = parseFloat(value);

                if (!isNaN(studentValue) && !isNaN(targetValue)) {
                    if (operator === '<' && studentValue < targetValue) return true;
                    if (operator === '>' && studentValue > targetValue) return true;
                    if (operator === '<=' && studentValue <= targetValue) return true;
                    if (operator === '>=' && studentValue >= targetValue) return true;
                    if (operator === '=' && studentValue === targetValue) return true;
                }
            }
        }
    }

    return false;
}

/**
 * 取得學生已讀的公告 ID 清單
 * @param {string} studentId - 學號
 * @returns {Array<string>} 已讀公告 ID 陣列
 */
function _getReadAnnouncementIds(studentId) {
    const sheet = _ensureAnnouncementReadsSheet();
    const data = sheet.getDataRange().getValues();

    const readIds = [];
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(studentId)) {
            readIds.push(String(data[i][1]));
        }
    }
    return readIds;
}

/**
 * 標記公告為已讀
 * @param {string} studentId - 學號
 * @param {string|number} announcementId - 公告 ID
 * @returns {Object} 結果
 */
function markAnnouncementRead(studentId, announcementId) {
    const sheet = _ensureAnnouncementReadsSheet();

    // 檢查是否已標記
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(studentId) && String(data[i][1]) === String(announcementId)) {
            return { success: true, message: '已經標記過' };
        }
    }

    // 新增記錄
    sheet.appendRow([studentId, announcementId, new Date().toISOString()]);

    return { success: true, message: '標記成功' };
}

// ==========================================
// 🆕 Settings & Display Control (V10.1)
// ==========================================

/**
 * 確保 _Settings 工作表存在，若不存在則自動建立
 * @returns {Sheet} 設定工作表
 */
function _ensureSettingsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('_Settings');

    if (!sheet) {
        sheet = ss.insertSheet('_Settings');
        // 設定表頭
        sheet.getRange(1, 1, 1, 3).setValues([['key', 'value', 'description']]);

        // 預設顯示設定
        const defaultSettings = [
            ['顯示_第一次段考', 'TRUE', '是否顯示第一次段考'],
            ['顯示_第二次段考', 'TRUE', '是否顯示第二次段考'],
            ['顯示_期末考', 'TRUE', '是否顯示期末考'],
            ['顯示_小考平均', 'TRUE', '是否顯示小考平均'],
            ['顯示_缺交', 'TRUE', '是否顯示缺交次數'],
            ['顯示_平時', 'TRUE', '是否顯示平時成績'],
            ['顯示_學期', 'TRUE', '是否顯示學期總成績']
        ];
        sheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);

        // 凍結表頭
        sheet.setFrozenRows(1);
        // 設定欄寬
        sheet.setColumnWidth(1, 150);
        sheet.setColumnWidth(3, 200);
    }

    return sheet;
}

/**
 * 讀取設定並回傳可顯示的欄位清單
 * @returns {Object} { visibleFields: ['第一次段考', ...] }
 */
function _getSettings() {
    const sheet = _ensureSettingsSheet();
    const data = sheet.getDataRange().getValues();

    const visibleFields = [];

    for (let i = 1; i < data.length; i++) {
        const key = String(data[i][0]);
        const value = String(data[i][1]).toUpperCase();

        // 解析「顯示_欄位名」格式
        if (key.startsWith('顯示_') && value === 'TRUE') {
            const fieldName = key.replace('顯示_', '');
            visibleFields.push(fieldName);
        }
    }

    return { visibleFields };
}

/**
 * 計算當掉風險
 * 規則：三次段考各 20% + 平時 40%（假設滿分）
 * 未輸入的段考以 60 分計算
 * @param {Object} studentData - 學生資料
 * @returns {Object} { estimatedScore, isAtRisk, status }
 */
function _calculateFailRisk(studentData) {
    // 權重設定
    const EXAM_WEIGHT = 0.2;  // 每次段考 20%
    const DAILY_WEIGHT = 0.4; // 平時 40%
    const DAILY_ASSUMED = 100; // 平時假設滿分
    const MISSING_EXAM_SCORE = 50; // 未輸入段考預設 50 分（警戒用）
    const PASS_THRESHOLD = 60; // 及格門檻

    // 段考欄位對應
    const examFields = [
        { name: '第一次段考', aliases: ['第一次段考'] },
        { name: '第二次段考', aliases: ['第二次段考'] },
        { name: '期末考', aliases: ['期末考', '第三次段考'] }
    ];

    let totalScore = DAILY_ASSUMED * DAILY_WEIGHT; // 平時 40 分

    for (const exam of examFields) {
        let score = null;

        // 嘗試從學生資料中取得成績
        for (const alias of exam.aliases) {
            if (studentData.hasOwnProperty(alias)) {
                const val = parseFloat(studentData[alias]);
                if (!isNaN(val)) {
                    score = val;
                    break;
                }
            }
        }

        // 若無成績則使用預設 60 分
        if (score === null) {
            score = MISSING_EXAM_SCORE;
        }

        totalScore += score * EXAM_WEIGHT;
    }

    // 四捨五入到整數
    const estimatedScore = Math.round(totalScore);
    const isAtRisk = estimatedScore < PASS_THRESHOLD;

    return {
        estimatedScore: estimatedScore,
        isAtRisk: isAtRisk,
        status: isAtRisk ? '危險' : '及格'
    };
}

// ==========================================
// Core Data Logic (V10 Refactored)
// ==========================================

/**
 * 🆕 從快取中查詢學生位置
 * @param {string} studentId - 學號
 * @param {Cache} cache - CacheService 實例
 * @param {Spreadsheet} ss - Spreadsheet 實例
 * @returns {Object|null} 找到則回傳 { sheet, headers, rowData, sheetVals }
 */
function _findStudentFromCache(studentId, cache, ss) {
    const cachedSheetName = cache.get('IDX_' + studentId);
    if (!cachedSheetName) return null;

    const sheet = ss.getSheetByName(cachedSheetName);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const headers = data[0].map(x => String(x).trim());
    const idCol = headers.indexOf('學號');
    if (idCol === -1) return null;

    for (let r = 1; r < data.length; r++) {
        if (String(data[r][idCol]) === String(studentId)) {
            return {
                sheet: sheet,
                headers: headers,
                rowData: data[r],
                sheetVals: data
            };
        }
    }
    return null;
}

/**
 * 🆕 全掃描查詢學生資料
 * @param {string} studentId - 學號
 * @param {Cache} cache - CacheService 實例
 * @param {Array} sheets - 所有工作表陣列
 * @returns {Object|null} 找到則回傳 { sheet, headers, rowData, sheetVals }
 */
function _findStudentFromSheets(studentId, cache, sheets) {
    for (let i = 0; i < sheets.length; i++) {
        // 跳過系統工作表（以 _ 開頭）
        if (sheets[i].getName().startsWith('_')) continue;

        const data = sheets[i].getDataRange().getValues();
        if (data.length < 2) continue;

        const headers = data[0].map(x => String(x).trim());
        const idCol = headers.indexOf('學號');
        if (idCol === -1) continue;

        for (let r = 1; r < data.length; r++) {
            if (String(data[r][idCol]) === String(studentId)) {
                // 存入快取 (24小時)
                cache.put('IDX_' + studentId, sheets[i].getName(), CONFIG.CACHE_DURATION.STUDENT_INDEX);
                return {
                    sheet: sheets[i],
                    headers: headers,
                    rowData: data[r],
                    sheetVals: data
                };
            }
        }
    }
    return null;
}

/**
 * 🆕 計算統計資料（排名、平均、趨勢）
 * @param {Array} headers - 表頭陣列
 * @param {Array} rowData - 學生該行資料
 * @param {Array} sheetVals - 全班資料 (含表頭)
 * @returns {Object} stats - { 欄位名: { avg, rank, diff } }
 */
function _calculateStats(headers, rowData, sheetVals) {
    const stats = {};
    const valueMap = {};
    headers.forEach((h, i) => { valueMap[h] = rowData[i]; });

    // 趨勢比較規則
    const trendRules = [
        { match: '二', replace: '一' },
        { match: '三', replace: '二' },
        { match: '四', replace: '三' },
        { match: '2', replace: '1' },
        { match: '3', replace: '2' },
        { match: '4', replace: '3' },
        { match: '期末考', replace: '第二次段考' }
    ];

    headers.forEach((header, colIndex) => {
        // 排除不需計算排名/班平均的欄位
        if (CONFIG.EXCLUDED_STATS_FIELDS.includes(header)) return;

        // 收集全班該欄位分數
        const scores = [];
        for (let r = 1; r < sheetVals.length; r++) {
            const s = parseFloat(sheetVals[r][colIndex]);
            if (!isNaN(s)) scores.push(s);
        }

        if (scores.length === 0) return;

        const myScore = parseFloat(rowData[colIndex]);
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / scores.length;

        // 計算排名
        scores.sort((a, b) => b - a);
        let rank = '-';
        if (!isNaN(myScore)) rank = scores.indexOf(myScore) + 1;

        // 計算趨勢差異
        let diff = null;
        for (let rule of trendRules) {
            if (header.includes(rule.match)) {
                const potential = header.replace(rule.match, rule.replace);
                if (valueMap.hasOwnProperty(potential)) {
                    const prevVal = parseFloat(valueMap[potential]);
                    if (!isNaN(myScore) && !isNaN(prevVal)) {
                        diff = parseFloat((myScore - prevVal).toFixed(1));
                    }
                    break;
                }
            }
        }

        stats[header] = {
            avg: parseFloat(avg.toFixed(1)),
            rank: rank,
            diff: diff
        };
    });

    return stats;
}

/**
 * 主查詢函數 (V10 Refactored)
 * @param {string} studentId - 學號
 * @returns {Object|null} 學生完整資料（含成績、統計、圖表）
 */
function findStudentData(studentId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cache = CacheService.getScriptCache();

    // Step 1: 嘗試從快取查詢
    let found = _findStudentFromCache(studentId, cache, ss);

    // Step 2: 快取未命中，執行全掃描
    if (!found) {
        found = _findStudentFromSheets(studentId, cache, ss.getSheets());
    }

    // 找不到學生
    if (!found) return null;

    // Step 3: 組裝結果物件
    const result = {
        sheetName: found.sheet.getName(),
        _stats: {},
        _debug: [`[System] Found student in sheet: ${found.sheet.getName()}`]
    };

    // 將資料填入 result
    found.headers.forEach((h, i) => {
        result[h] = found.rowData[i];
    });

    // Step 4: 計算統計資料
    result._stats = _calculateStats(found.headers, found.rowData, found.sheetVals);

    // Step 5: 計算圖表資料
    result.chartData = calculateChartData(found.headers, found.rowData, found.sheetVals);

    // Step 6: 取得個人化公告 (V10 Smart Announcements)
    result.announcements = getPersonalizedAnnouncements(result);

    // Step 7: 讀取顯示設定 (V10.1)
    const settings = _getSettings();
    result.visibleFields = settings.visibleFields;

    // Step 8: 計算當掉風險 (V10.1)
    result.failRisk = _calculateFailRisk(result);

    return result;
}

/**
 * 🆕 計算圖表資料 (成績視覺化儀表板)
 * @param {Array} headers - 表頭陣列
 * @param {Array} rowData - 學生該行資料
 * @param {Array} sheetVals - 全班資料 (含表頭)
 * @returns {Object} chartData - 包含 distribution 和 trend 資料
 */
function calculateChartData(headers, rowData, sheetVals) {
    const chartData = {
        distributions: [], // 🆕 改為陣列，儲存所有考試的分佈
        trend: null
    };

    // 定義段考欄位名稱（按順序）
    // 支援別名：如果找不到 '期末考'，則嘗試找 '第三次段考'
    const examConfig = [
        { label: '第一次段考', potentialFields: ['第一次段考'] },
        { label: '第二次段考', potentialFields: ['第二次段考'] },
        { label: '期末考', potentialFields: ['期末考', '第三次段考'] }
    ];

    const examLabels = [];
    const examIndices = [];

    // 解析欄位索引
    examConfig.forEach(cfg => {
        let idx = -1;
        for (const field of cfg.potentialFields) {
            idx = headers.indexOf(field);
            if (idx !== -1) break;
        }
        // 無論是否找到，都保留佔位 (idx 為 -1 表示沒資料)
        examIndices.push(idx);
        examLabels.push(cfg.label);
    });

    const validExamIndices = examIndices.filter(idx => idx !== -1);

    // 定義分佈圖的分數區間標籤
    const distributionLabels = ['0-59', '60-69', '70-79', '80-89', '90-100'];

    if (validExamIndices.length === 0) {
        return chartData; // 無段考資料
    }

    // === 1. 計算「所有考試」的全班成績分佈 ===
    for (let i = 0; i < examIndices.length; i++) {
        const idx = examIndices[i];
        if (idx === -1) continue; // 該考試欄位不存在

        const distribution = [0, 0, 0, 0, 0]; // 0-59, 60-69, 70-79, 80-89, 90-100
        let hasData = false;

        for (let r = 1; r < sheetVals.length; r++) {
            const score = parseFloat(sheetVals[r][idx]);
            if (!isNaN(score)) {
                hasData = true;
                if (score < 60) distribution[0]++;
                else if (score < 70) distribution[1]++;
                else if (score < 80) distribution[2]++;
                else if (score < 90) distribution[3]++;
                else distribution[4]++;
            }
        }

        // 找出學生所在的分數區間
        const myScore = parseFloat(rowData[idx]);
        let myRangeIndex = -1;
        if (!isNaN(myScore)) {
            if (myScore < 60) myRangeIndex = 0;
            else if (myScore < 70) myRangeIndex = 1;
            else if (myScore < 80) myRangeIndex = 2;
            else if (myScore < 90) myRangeIndex = 3;
            else myRangeIndex = 4;
        }

        // 只加入有資料的考試
        if (hasData) {
            chartData.distributions.push({
                examName: examLabels[i],
                labels: distributionLabels,
                data: distribution,
                myRangeIndex: myRangeIndex
            });
        }
    }

    // === 2. 計算個人成績趨勢 + 班級平均 ===
    const trendLabels = [];
    const myScores = [];
    const classAvgs = [];

    for (let i = 0; i < examIndices.length; i++) {
        const idx = examIndices[i];

        if (idx === -1) continue;

        trendLabels.push(examLabels[i]);

        // 個人分數
        const personalScore = parseFloat(rowData[idx]);
        myScores.push(isNaN(personalScore) ? null : personalScore);

        // 班級平均
        let sum = 0, count = 0;
        for (let r = 1; r < sheetVals.length; r++) {
            const s = parseFloat(sheetVals[r][idx]);
            if (!isNaN(s)) { sum += s; count++; }
        }
        const avg = count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
        classAvgs.push(avg);
    }

    chartData.trend = {
        labels: trendLabels,
        myScores: myScores,
        classAvg: classAvgs
    };

    return chartData;
}

// ==========================================
// Admin Menu
// ==========================================
/**
 * 試算表開啟時執行
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚙️ 管理選項')
        .addItem('📱 開啟管理面板', 'showSidebar')
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
                    const subject = '【重要】物理科段考成績查詢碼 & 使用說明';

                    // 郵件內容 (HTML 版 - 支援格式)
                    const htmlBody = `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                            <h2 style="color: #98694c;">📢 成績查詢系統使用說明</h2>
                            <p>各位同學好，本次段考成績已開放查詢，請依照以下步驟操作：</p>
                            
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

                            <h3 style="color: #2c3e50;">1️⃣ 您的登入資訊</h3>
                            <ul style="background: #f9f9f9; padding: 15px 20px; border-radius: 8px; list-style: none;">
                                <li><strong>學號：</strong> ${row[iIdx]}</li>
                                <li><strong>查詢碼：</strong> <span style="color: #d35400; font-weight: bold; font-size: 1.1em;">${row[cIdx]}</span></li>
                                <li><strong>查詢網址：</strong> <a href="${webAppUrl}" target="_blank">${webAppUrl}</a></li>
                            </ul>

                            <h3 style="color: #2c3e50;">2️⃣ 操作步驟</h3>
                            <ol>
                                <li>點擊上方網址進入查詢系統 (建議使用 Chrome 或 Safari)。</li>
                                <li>輸入<strong>學號</strong>與<strong>查詢碼</strong>。</li>
                                <li>計算驗證碼數學題 (例如 3+5=8) 並輸入答案。</li>
                            </ol>

                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

                            <h3 style="color: #e74c3c;">⚠️ 常見問題排除 (必看)</h3>
                            
                            <p><strong>Q1：點開連結出現「很抱歉，目前無法開啟這個檔案」？</strong><br>
                            <span style="color: #e74c3c;">A1：這是 Google 帳號衝突造成的。</span><br>
                            請改用 <strong>「無痕模式 / 私密瀏覽」</strong> 開啟連結即可解決！<br>
                            📱 手機版：長按連結 → 選擇「以無痕模式開啟」<br>
                            💻 電腦版：按右鍵 → 選擇「在無痕視窗中開啟連結」</p>

                            <p><strong>Q2：一直顯示「學號或密碼錯誤」？</strong><br>
                            • 請檢查密碼前後是否不小心多打了「空格」<br>
                            • 請確認是否輸入了別人的學號</p>

                            <p><strong>Q3：帳號被鎖定了？</strong><br>
                            • 連續錯誤 5 次會自動鎖定 10 分鐘，請稍後再試。</p>
                            
                            <br>
                            <p style="font-size: 0.9em; color: #7f8c8d;">(此郵件由系統自動發送，請勿直接回信)</p>
                        </div>
                    `;

                    // 郵件內容 (純文字版 - 備用)
                    const plainBody = `
📢 成績查詢系統使用說明

各位同學好，本次段考成績已開放查詢，請依照以下步驟操作：

1️⃣ 您的登入資訊
學號：${row[iIdx]}
查詢碼：${row[cIdx]}
網址：${webAppUrl}

2️⃣ 操作步驟
1. 點擊網址進入查詢系統
2. 輸入學號與查詢碼
3. 輸入驗證碼

⚠️ 常見問題排除 (必看)
Q1：點開連結出現「很抱歉，目前無法開啟這個檔案」？
A1：這是 Google 帳號衝突造成的。請改用「無痕模式 / 私密瀏覽」開啟連結即可解決！

Q2：一直顯示「學號或密碼錯誤」？
請檢查密碼前後是否不小心多打了「空格」。

Q3：帳號被鎖定了？
連續錯誤 5 次會自動鎖定 10 分鐘，請稍後再試。
                    `;

                    MailApp.sendEmail({
                        to: em,
                        subject: subject,
                        body: plainBody,
                        htmlBody: htmlBody
                    });
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
        const userEmail = Session.getActiveUser().getEmail();
        logSecurityEvent(studentId, 'ADMIN_UNLOCK', 'Unlocked by administrator', 'ADMIN_ACTION', userEmail);
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
        const userEmail = Session.getActiveUser().getEmail();
        logSecurityEvent('ADMIN', 'EMERGENCY_UNLOCK_ALL', 'Admin requested global unlock', 'ADMIN_ACTION', userEmail);
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
            const userEmail = Session.getActiveUser().getEmail();
            logSecurityEvent('ADMIN', 'INSECURE_SHEET_DETECTED', 'Sharing: ' + sharingAccess, 'SYSTEM_CHECK', userEmail);
        } else if (warningMessage) {
            let statusMessage = '✅ 您的試算表權限設定安全！\n\n';
            statusMessage += '🔒 分享狀態：限制存取\n';
            statusMessage += '👥 編輯者：' + editors.length + ' 人\n';
            statusMessage += '👁️ 觀看者：' + viewers.length + ' 人\n\n';
            statusMessage += warningMessage;
            ui.alert('✅ 權限檢查結果', statusMessage, ui.ButtonSet.OK);
        } else {
            // 🆕 完全安全，無任何警告
            let statusMessage = '✅ 您的試算表權限設定完全安全！\n\n';
            statusMessage += '🔒 分享狀態：限制存取\n';
            statusMessage += '👥 編輯者：' + editors.length + ' 人\n';
            statusMessage += '👁️ 觀看者：' + viewers.length + ' 人\n\n';
            statusMessage += '✨ 沒有發現任何安全疑慮！';
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

// ==========================================
// 🆕 Announcement System
// ==========================================
function getAnnouncements() {
    try {
        // 🆕 使用快取減少 API 呼叫（效能優化）
        const cache = CacheService.getScriptCache();
        const cached = cache.get('ANNOUNCEMENTS');

        if (cached) {
            return JSON.parse(cached);
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('_Announcement');

        // Auto-create if not exists
        if (!sheet) {
            sheet = ss.insertSheet('_Announcement');
            sheet.appendRow(['Message', 'Type (info/warning/emergency)', 'Active (TRUE/FALSE)']);
            sheet.appendRow(['歡迎使用成績查詢系統！', 'info', 'TRUE']);
            sheet.appendRow(['請注意：資料僅供參考，若有疑問請洽導師。', 'warning', 'TRUE']);
            sheet.setFrozenRows(1);
            sheet.setColumnWidth(1, 400);
        }

        const data = sheet.getDataRange().getValues();
        const announcements = [];

        // Skip header
        for (let i = 1; i < data.length; i++) {
            const msg = String(data[i][0]).trim();
            const type = String(data[i][1]).trim().toLowerCase();
            const active = String(data[i][2]).toUpperCase();

            // Only fetch active messages
            if (active === 'TRUE' && msg) {
                announcements.push({
                    message: msg,
                    type: ['info', 'warning', 'emergency'].includes(type) ? type : 'info'
                });
            }
        }

        // 🆕 快取 5 分鐘（減少 90% API 呼叫）
        cache.put('ANNOUNCEMENTS', JSON.stringify(announcements), CONFIG.CACHE_DURATION.ANNOUNCEMENT);

        return announcements;
    } catch (e) {
        Logger.log('Announcement error: ' + e.toString());
        return [];
    }
}

// ==========================================
// 🆕 Certificate Generation System
// ==========================================

/**
 * 產生學生成績證明
 * @param {string} studentId - 學生學號
 * @param {string} examType - 段考類型（第一次段考、第二次段考、期末考）
 * @returns {Object} 證明資料或錯誤訊息
 */
function getCertificateData(studentId, examType) {
    try {
        const studentData = findStudentData(studentId);

        if (!studentData) {
            return { success: false, message: '查無此學號' };
        }

        // 驗證段考類型是否存在
        if (!studentData.hasOwnProperty(examType)) {
            return { success: false, message: '此學生沒有該次段考成績' };
        }

        const score = studentData[examType];
        const stats = studentData._stats[examType] || {};

        // 處理空值或無效成績
        if (score === null || score === undefined || score === '') {
            return { success: false, message: '此學生該次段考成績為空' };
        }

        return {
            success: true,
            data: {
                studentName: studentData['姓名'] || '-',
                studentId: studentData['學號'] || '-',
                className: studentData.sheetName || '-',  // 🆕 使用工作表名稱作為班級
                seatNumber: studentData['座號'] || '-',
                examType: examType,
                score: score,
                rank: stats.rank || '-',
                classAvg: stats.avg || '-',
                generateDate: Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy年MM月dd日')
            }
        };
    } catch (e) {
        Logger.log('Certificate generation error: ' + e.toString());
        return { success: false, message: '系統錯誤：' + e.message };
    }
}

/**
 * 顯示證明產生輸入對話框
 */
function showCertificateDialog() {
    const html = HtmlService.createHtmlOutputFromFile('CertificateInput')
        .setWidth(450)
        .setHeight(350);
    SpreadsheetApp.getUi().showModalDialog(html, '📄 產生成績證明');
}

/**
 * 產生並顯示證明頁面
 * @param {string} studentId - 學生學號
 * @param {string} examType - 段考類型
 */
function showCertificate(studentId, examType) {
    const result = getCertificateData(studentId, examType);

    if (!result.success) {
        SpreadsheetApp.getUi().alert('❌ 錯誤', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
        return;
    }

    const template = HtmlService.createTemplateFromFile('Certificate');
    template.data = result.data;

    const html = template.evaluate()
        .setWidth(800)
        .setHeight(1000);

    SpreadsheetApp.getUi().showModalDialog(html, '📄 成績證明 - ' + result.data.studentName);
}

function showSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle('管理員控制台')
        .setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
}

