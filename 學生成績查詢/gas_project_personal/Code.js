/**
 * Google Apps Script Backend Code
 * Project: Student Grade Inquiry System V10.2 (Namespace Refactor)
 * Features: Modular Architecture within Single File
 */

// ==========================================
// 1. GLOBAL CONFIGURATION
// ==========================================
var CONFIG = {
    SHEET_PASSWORD_COL: 2,
    LOCKOUT_ATTEMPTS: 3,
    LOCKOUT_DURATION: 600,
    SESSION_TIMEOUT: 1800,

    // Internal System Version
    SYSTEM_VERSION: '1.0.0',

    // Global DDoS Protection
    GLOBAL_FAIL_LIMIT: 120,
    GLOBAL_WINDOW: 60,
    GLOBAL_PANIC_DURATION: 180,

    // Admin Alert
    ADMIN_EMAIL: 'maxgdodo@gmail.com',

    // Frontend Logic Sync
    EXCLUDED_STATS_FIELDS: ['學號', '姓名', '查詢碼', 'Email', '班級', '座號', '備註', '缺交', '小考平均', '平時', '學期'],
    NO_DISPLAY_STATS_FIELDS: ['缺交', '小考平均', '平時', '學期'],

    // Cache Duration
    CACHE_DURATION: {
        STUDENT_INDEX: 86400,    // 24hr
        ANNOUNCEMENT: 300,       // 5min
        CAPTCHA: 600            // 10min
    },

    SYSTEM_OPEN_TIME: '',
    SYSTEM_CLOSE_TIME: ''
};

// ==========================================
// 2. MAIN ENTRY POINTS (Global Scope)
// ==========================================

function doGet(e) {
    return App.doGet(e);
}

// 供前端呼叫的 API 橋接函數
function login(studentId, password, captchaToken, captchaAnswer, seatNumber, sessionId) {
    return Auth.login(studentId, password, captchaToken, captchaAnswer, seatNumber, sessionId);
}

function getCaptcha() {
    return Auth.getCaptcha();
}

function markAnnouncementRead(studentId, announcementId) {
    return Announcement.markRead(studentId, announcementId);
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// 3. MODULES (Namespace Pattern)
// ==========================================

// --- App Module: Core Logic ---
var App = {
    doGet: function (e) {
        // System Access Toggle Check
        const props = PropertiesService.getScriptProperties();
        const status = props.getProperty('system_status');
        if (status === 'CLOSED') {
            return this.renderMessage('🛑 系統維護中', '目前老師正在更新成績，查詢功能暫時關閉。請稍後再試。');
        }

        // Time Limit Check
        const now = new Date();
        if (CONFIG.SYSTEM_OPEN_TIME && now < new Date(CONFIG.SYSTEM_OPEN_TIME)) {
            return this.renderMessage('⏳ 系統尚未開放', `開放時間：${CONFIG.SYSTEM_OPEN_TIME}`);
        }
        if (CONFIG.SYSTEM_CLOSE_TIME && now > new Date(CONFIG.SYSTEM_CLOSE_TIME)) {
            return this.renderMessage('🛑 查詢活動已結束', `截止時間：${CONFIG.SYSTEM_CLOSE_TIME}`);
        }

        const template = HtmlService.createTemplateFromFile('Index');

        // Capture User Email
        let activeUser = 'Anonymous';
        try {
            const email = Session.getActiveUser().getEmail();
            if (email) activeUser = email;
        } catch (e) { console.warn(e); }
        template.userEmail = activeUser;

        return template.evaluate()
            .setTitle('物理科段考成績查詢系統')
            .addMetaTag('viewport', 'width=device-width, initial-scale=1')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    },

    renderMessage: function (title, body) {
        return HtmlService.createHtmlOutput(`
            <div style="font-family:sans-serif;text-align:center;padding:50px;">
                <h1>${title}</h1>
                <p>${body}</p>
            </div>
        `).setTitle(title);
    }
};

// --- Auth Module: Authentication & Security ---
var Auth = {
    getCaptcha: function () {
        // Logic same as before
        const num1 = Math.floor(Math.random() * 9) + 1;
        const num2 = Math.floor(Math.random() * 9) + 1;
        const operators = ['+', '-', '×'];
        const operator = operators[Math.floor(Math.random() * operators.length)];

        let answer, fn1 = num1, fn2 = num2;
        if (operator === '-') {
            if (num1 < num2) { fn1 = num2; fn2 = num1; }
            answer = fn1 - fn2;
        } else if (operator === '×') answer = fn1 * fn2;
        else answer = fn1 + fn2;

        const token = Utilities.getUuid();
        CacheService.getScriptCache().put('CAPTCHA_' + token, answer.toString(), CONFIG.CACHE_DURATION.CAPTCHA);

        // Simple SVG generation
        const text = `${fn1} ${operator} ${fn2} = ?`;
        const svg = `<svg width="150" height="50" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #ccc;border-radius:4px;"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="24">${text}</text></svg>`;
        return { svg: svg, token: token };
    },

    login: function (studentId, password, captchaToken, captchaAnswer, seatNumber, sessionId) {
        // [New V10.3] System Toggle Check - Protect API Endpoint too
        const props = PropertiesService.getScriptProperties();
        if (props.getProperty('system_status') === 'CLOSED') {
            return {
                success: false,
                message: '🛑 系統維護中：目前老師正在更新成績，查詢功能暫時關閉。請稍後再試。',
                locked: true
            };
        }

        const cache = CacheService.getScriptCache();
        studentId = String(studentId).trim();
        sessionId = sessionId || 'NO-SESSION';
        var userEmail = '';
        try { userEmail = Session.getActiveUser().getEmail() || ''; } catch(e) { userEmail = 'Anonymous'; }

        // 1. DDoS Check
        if (cache.get('GLOBAL_PANIC')) return { success: false, message: '⚠️ 系統流量異常，請稍後再試。' };

        // 2. Lockout Check
        const lockKey = 'LOCK_' + studentId;
        if (cache.get(lockKey)) {
            Security.log(studentId, 'LOGIN_BLOCKED', 'Locked out', sessionId, userEmail);
            return { success: false, message: '帳號鎖定中，請稍後再試。', locked: true };
        }

        // 3. Captcha Verify
        const realAnswer = cache.get('CAPTCHA_' + captchaToken);
        if (!realAnswer || realAnswer !== captchaAnswer.toString().trim()) {
            Security.monitorGlobalFails(cache);
            return { success: false, message: '驗證碼錯誤。' };
        }
        cache.remove('CAPTCHA_' + captchaToken);

        // 4. Data Lookup
        const studentData = Data.findStudent(studentId);
        if (!studentData) {
            Security.monitorGlobalFails(cache);
            const res = Security.handleFailedAttempt(studentId, cache, lockKey, null, userEmail, sessionId);
            return { success: false, message: res.message, locked: res.locked };
        }

        // 5. Password Check
        if (studentData['查詢碼'] != password) {
            Security.monitorGlobalFails(cache);
            const attemptKey = 'ATT_FAIL_' + studentId;
            const attempts = Number(cache.get(attemptKey)) || 0;

            // Seat Number Check Logic
            if (attempts >= 1 && seatNumber) {
                if (!Security.verifySeat(studentData, seatNumber)) {
                    cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
                    Security.alertAdmin('惡意鎖定攻擊', `ID: ${studentId}, User: ${userEmail}`);
                    return { success: false, message: '座號錯誤，帳號已鎖定。', locked: true };
                }
            }

            const res = Security.handleFailedAttempt(studentId, cache, lockKey, seatNumber, userEmail, sessionId);
            return { success: false, message: res.message, locked: res.locked, requireSeatNumber: res.requireSeatNumber };
        }

        // Success
        const cleanData = Data.formatStudentData(studentData);
        const announcements = Announcement.getPersonalized(cleanData);
        Security.log(studentId, 'LOGIN_SUCCESS', 'OK', sessionId, userEmail);

        return {
            success: true,
            data: cleanData,
            config: { noStatsFields: CONFIG.NO_DISPLAY_STATS_FIELDS },
            announcements: announcements
        };
    }
};

// --- Security Module ---
var Security = {
    log: function (id, type, detail, sessId, email) {
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            let sheet = ss.getSheetByName('_SecurityLog');
            if (!sheet) {
                sheet = ss.insertSheet('_SecurityLog');
                sheet.appendRow(['Timestamp', 'ID', 'Type', 'Detail', 'Session', 'Email']);
            }
            sheet.appendRow([new Date(), id, type, detail, sessId, email]);
        } catch (e) { }
    },

    monitorGlobalFails: function (cache) {
        const k = 'GLOBAL_FAIL_COUNT';
        const current = (Number(cache.get(k)) || 0) + 1;
        cache.put(k, current.toString(), CONFIG.GLOBAL_WINDOW);
        if (current >= CONFIG.GLOBAL_FAIL_LIMIT && !cache.get('GLOBAL_PANIC')) {
            cache.put('GLOBAL_PANIC', 'TRUE', CONFIG.GLOBAL_PANIC_DURATION);
            this.alertAdmin('DDoS Alert', `Traffic spike: ${current}/min`);
        }
    },

    handleFailedAttempt: function (id, cache, lockKey, seatNumber, email, sessId) {
        const k = 'ATT_FAIL_' + id;
        let attempts = Number(cache.get(k)) || 0;
        attempts++;
        cache.put(k, attempts.toString(), CONFIG.LOCKOUT_DURATION);

        if (attempts === 2) return { locked: false, requireSeatNumber: true, message: '請輸入座號以繼續。' };
        if (attempts >= 6) {
            cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
            this.log(id, 'ACCOUNT_LOCKED', `Failed ${attempts} times`, sessId, email);
            return { locked: true, message: '帳號已鎖定。' };
        }
        return { locked: false, message: '學號或密碼錯誤。' };
    },

    verifySeat: function (data, inputSeat) {
        return String(data['座號']).trim() === String(inputSeat).trim();
    },

    alertAdmin: function (sub, body) {
        if (CONFIG.ADMIN_EMAIL) MailApp.sendEmail(CONFIG.ADMIN_EMAIL, sub, body);
    }
};

// --- Data Module ---
var Data = {
    findStudent: function (id) {
        // Cache priority
        const cache = CacheService.getScriptCache();
        const cachedSheet = cache.get('IDX_' + id);
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        if (cachedSheet) {
            const sheet = ss.getSheetByName(cachedSheet);
            if (sheet) return this._scanSheet(sheet, id);
        }

        // Full scan
        const sheets = ss.getSheets();
        for (let sheet of sheets) {
            if (sheet.getName().startsWith('_')) continue;
            const res = this._scanSheet(sheet, id);
            if (res) {
                cache.put('IDX_' + id, sheet.getName(), CONFIG.CACHE_DURATION.STUDENT_INDEX);
                return res;
            }
        }
        return null;
    },

    _scanSheet: function (sheet, id) {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return null;
        const headers = data[0].map(String);
        const idIdx = headers.indexOf('學號');
        if (idIdx === -1) return null;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][idIdx]) === String(id)) {
                return this._buildStudentObj(headers, data[i], data, sheet.getName());
            }
        }
        return null;
    },

    _buildStudentObj: function (headers, row, allRows, sheetName) {
        const obj = { _stats: {}, sheetName: sheetName };
        headers.forEach((h, i) => obj[h] = row[i]);

        // Calculate Stats
        headers.forEach((h, colIdx) => {
            if (CONFIG.EXCLUDED_STATS_FIELDS.includes(h)) return;
            const scores = allRows.slice(1).map(r => parseFloat(r[colIdx])).filter(n => !isNaN(n));
            if (scores.length === 0) return;

            const myScore = parseFloat(row[colIdx]);
            if (isNaN(myScore)) return;

            // Rank
            const rank = scores.filter(s => s > myScore).length + 1;
            // Avg
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = Math.round((sum / scores.length) * 10) / 10;

            obj._stats[h] = { rank: rank, avg: avg };
        });

        // Fail Risk
        obj.failRisk = this._calcRisk(obj);

        // Chart Data
        obj.chartData = this._getChartData(headers, row, allRows);

        return obj;
    },

    formatStudentData: function (data) {
        // Formatting specific fields
        const fields = ['平時', '學期', '小考平均', '第一次段考', '第二次段考', '期末考', '第三次段考'];
        fields.forEach(f => {
            if (data[f]) data[f] = Utils.formatScore(data[f]);
        });
        if (data['缺交']) data['缺交'] = Utils.formatInt(data['缺交']);

        // Remove confidential
        delete data['查詢碼'];
        delete data['座號'];
        return data;
    },

    _calcRisk: function (data) {
        // Simplistic logic for brevity
        let score = 40; // Base (Daily 40%)
        const exams = ['第一次段考', '第二次段考', '期末考'];
        exams.forEach(e => {
            const val = parseFloat(data[e] || data['第三次段考'] || 50);
            score += val * 0.2;
        });
        return { estimatedScore: Math.round(score), isAtRisk: score < 60 };
    },

    _getChartData: function (headers, row, allRows) {
        var examFields = ['第一次段考', '第二次段考', '期末考', '第三次段考'];
        var distributions = [];
        var trendLabels = [];
        var trendMyScores = [];
        var trendClassAvg = [];

        examFields.forEach(function (examName) {
            var colIdx = headers.indexOf(examName);
            if (colIdx === -1) return;

            var myScore = parseFloat(row[colIdx]);
            if (isNaN(myScore)) return;

            // Collect all scores for this exam
            var allScores = [];
            for (var i = 1; i < allRows.length; i++) {
                var s = parseFloat(allRows[i][colIdx]);
                if (!isNaN(s)) allScores.push(s);
            }
            if (allScores.length === 0) return;

            // Distribution: 10-point buckets
            var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            var labels = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-99', '100'];
            var myRangeIndex = -1;

            allScores.forEach(function (s) {
                var idx = s >= 100 ? 10 : Math.floor(s / 10);
                if (idx < 0) idx = 0;
                if (idx > 10) idx = 10;
                buckets[idx]++;
            });

            var myIdx = myScore >= 100 ? 10 : Math.floor(myScore / 10);
            if (myIdx < 0) myIdx = 0;
            if (myIdx > 10) myIdx = 10;
            myRangeIndex = myIdx;

            distributions.push({
                examName: examName,
                labels: labels,
                data: buckets,
                myRangeIndex: myRangeIndex
            });

            // Trend data
            var avg = allScores.reduce(function (a, b) { return a + b; }, 0) / allScores.length;
            trendLabels.push(examName);
            trendMyScores.push(Math.round(myScore * 10) / 10);
            trendClassAvg.push(Math.round(avg * 10) / 10);
        });

        return {
            distributions: distributions,
            trend: { labels: trendLabels, myScores: trendMyScores, classAvg: trendClassAvg }
        };
    }
};

// --- Announcement Module ---
var Announcement = {
    markRead: function (studentId, announcementId) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('_AnnouncementReads');
        if (!sheet) {
            sheet = ss.insertSheet('_AnnouncementReads');
            sheet.appendRow(['StudentID', 'AnnounceID', 'Time']);
        }
        sheet.appendRow([studentId, announcementId, new Date()]);
        return { success: true };
    },

    getPersonalized: function (studentData) {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName('_Announcements');
        if (!sheet) return [];

        var data = sheet.getDataRange().getValues();
        if (data.length < 2) return [];
        var headers = data[0].map(String);
        // Expected columns: ID, Type, Target, Message, Active
        var idIdx = headers.indexOf('ID');
        var typeIdx = headers.indexOf('Type');
        var targetIdx = headers.indexOf('Target');
        var msgIdx = headers.indexOf('Message');
        var activeIdx = headers.indexOf('Active');

        if (idIdx === -1 || msgIdx === -1) return [];

        // Check read status
        var readSheet = ss.getSheetByName('_AnnouncementReads');
        var readSet = {};
        if (readSheet) {
            var readData = readSheet.getDataRange().getValues();
            for (var r = 1; r < readData.length; r++) {
                if (String(readData[r][0]) === String(studentData['學號'])) {
                    readSet[String(readData[r][1])] = true;
                }
            }
        }

        var announcements = [];
        for (var i = 1; i < data.length; i++) {
            // Skip inactive
            if (activeIdx !== -1 && String(data[i][activeIdx]).toUpperCase() === 'FALSE') continue;

            // Target filtering: 'all', class name, or specific student ID
            if (targetIdx !== -1) {
                var target = String(data[i][targetIdx]).trim();
                if (target && target.toLowerCase() !== 'all') {
                    var stuId = String(studentData['學號']);
                    var stuClass = String(studentData['班級'] || '');
                    var stuSheet = String(studentData.sheetName || '');
                    if (target !== stuId && target !== stuClass && target !== stuSheet) continue;
                }
            }

            var annId = String(data[i][idIdx]);
            announcements.push({
                id: annId,
                type: typeIdx !== -1 ? String(data[i][typeIdx]) : 'info',
                message: String(data[i][msgIdx]),
                isRead: !!readSet[annId]
            });
        }
        return announcements;
    }
};

// --- Utils Module ---
var Utils = {
    formatScore: function (v) {
        if (v === '' || v == null) return '-';
        return Math.round(parseFloat(v)).toString();
    },
    formatInt: function (v) {
        return parseInt(v) || 0;
    }
};

// ==========================================
// Admin Menu & System Toggle
// ==========================================
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('⭐ 成績查詢系統')
        .addItem('⚙️ 開啟管理員介面', 'openAdminSidebar')
        .addSeparator()
        .addItem('▶️ 開放學生查詢', 'enableQuerySystem')
        .addItem('⏸️ 關閉學生查詢 (維護中)', 'disableQuerySystem')
        .addToUi();
}

function openAdminSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle('系統管理介面')
        .setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
}

function enableQuerySystem() {
    PropertiesService.getScriptProperties().setProperty('system_status', 'OPEN');
    SpreadsheetApp.getUi().alert('系統狀態已更新', '目前學生【可以】查詢成績！', SpreadsheetApp.getUi().ButtonSet.OK);
}

function disableQuerySystem() {
    PropertiesService.getScriptProperties().setProperty('system_status', 'CLOSED');
    SpreadsheetApp.getUi().alert('系統狀態已更新', '系統已進入【維護中】！\n學生若開啟網址，將被阻擋並看到維護提示。', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ==========================================
// Admin Sidebar Functions
// ==========================================

/**
 * 為所有工作表產生 5 碼隨機查詢碼
 */
function generatePasswordsForAllSheets() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var count = 0;

    sheets.forEach(function (sheet) {
        if (sheet.getName().startsWith('_')) return;
        var data = sheet.getDataRange().getValues();
        if (data.length < 2) return;
        var headers = data[0].map(String);
        var pwdIdx = headers.indexOf('查詢碼');
        if (pwdIdx === -1) return;

        for (var i = 1; i < data.length; i++) {
            var code = String(Math.floor(10000 + Math.random() * 90000));
            sheet.getRange(i + 1, pwdIdx + 1).setValue(code);
            count++;
        }
    });

    SpreadsheetApp.getUi().alert('查詢碼產生完成', '已為 ' + count + ' 位學生產生查詢碼。', SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: true, count: count };
}

/**
 * 寄送查詢碼至學生 Email
 */
function sendQueryCodesToStudents() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var sent = 0;
    var failed = 0;

    sheets.forEach(function (sheet) {
        if (sheet.getName().startsWith('_')) return;
        var data = sheet.getDataRange().getValues();
        if (data.length < 2) return;
        var headers = data[0].map(String);
        var emailIdx = headers.indexOf('Email');
        var idIdx = headers.indexOf('學號');
        var pwdIdx = headers.indexOf('查詢碼');
        var nameIdx = headers.indexOf('姓名');
        if (emailIdx === -1 || pwdIdx === -1 || idIdx === -1) return;

        for (var i = 1; i < data.length; i++) {
            var email = String(data[i][emailIdx]).trim();
            var code = String(data[i][pwdIdx]).trim();
            var name = nameIdx !== -1 ? String(data[i][nameIdx]) : '同學';
            var id = String(data[i][idIdx]);
            if (!email || !code || email === 'undefined' || email === '') continue;

            try {
                MailApp.sendEmail({
                    to: email,
                    subject: '物理科成績查詢碼',
                    body: name + ' 同學你好，\n\n你的成績查詢碼為：' + code +
                        '\n學號：' + id +
                        '\n\n請至成績查詢系統登入查看成績。\n\n※ 此為系統自動寄送，請勿回覆。'
                });
                sent++;
            } catch (e) {
                console.warn('Failed to send to ' + email + ': ' + e.message);
                failed++;
            }
        }
    });

    SpreadsheetApp.getUi().alert('Email 寄送完成', '成功：' + sent + ' 封\n失敗：' + failed + ' 封', SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: true, sent: sent, failed: failed };
}

/**
 * 開啟成績證明輸入對話框
 */
function showCertificateDialog() {
    var html = HtmlService.createHtmlOutputFromFile('CertificateInput')
        .setWidth(450)
        .setHeight(350);
    SpreadsheetApp.getUi().showModalDialog(html, '產生成績證明');
}

/**
 * 產生並顯示成績證明（由 CertificateInput.html 呼叫）
 */
function showCertificate(studentId, examType) {
    var studentData = Data.findStudent(studentId);
    if (!studentData) throw new Error('找不到學號 ' + studentId + ' 的學生資料');

    var score = studentData[examType];
    if (score === undefined || score === null || score === '') {
        throw new Error('找不到「' + examType + '」的成績資料');
    }

    var stats = studentData._stats || {};
    var examStats = stats[examType] || {};

    var now = new Date();
    var year = now.getFullYear() - 1911;
    var month = now.getMonth() + 1;
    var day = now.getDate();

    var template = HtmlService.createTemplateFromFile('Certificate');
    template.data = {
        examType: examType,
        className: studentData['班級'] || '',
        seatNumber: studentData['座號'] || '',
        studentName: studentData['姓名'] || '',
        studentId: studentId,
        score: Math.round(parseFloat(score)),
        rank: examStats.rank || '-',
        generateDate: year + ' 年 ' + month + ' 月 ' + day + ' 日'
    };

    var html = template.evaluate()
        .setWidth(800)
        .setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, examType + '成績證明');
}

/**
 * 產生專案分享圖卡
 */
function showInstructionCard() {
    var url = ScriptApp.getService().getUrl();
    var html = HtmlService.createHtmlOutput(
        '<div style="font-family:sans-serif;text-align:center;padding:40px;background:#F3F1E5;min-height:100%;">' +
        '<h2 style="color:#45464D;letter-spacing:2px;">物理科段考成績查詢系統</h2>' +
        '<p style="color:#B4745A;font-size:13px;letter-spacing:3px;text-transform:uppercase;">Physics Department</p>' +
        '<div style="height:4px;background:linear-gradient(90deg,#9B8A5E,#B4745A,#45464D);margin:24px 0;border-radius:2px;"></div>' +
        '<div style="margin:24px 0;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
        '<p style="font-size:11px;color:#888;margin:0 0 8px;">查詢網址</p>' +
        '<p style="font-size:13px;word-break:break-all;color:#333;margin:0;">' + url + '</p>' +
        '</div>' +
        '<p style="font-size:11px;color:#999;margin-top:24px;">Designed by MAXCHAN V10.3</p>' +
        '</div>'
    ).setWidth(420).setHeight(380);
    SpreadsheetApp.getUi().showModalDialog(html, '專案分享圖卡');
}

/**
 * 查看安全日誌
 */
function viewSecurityLog() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('_SecurityLog');
    if (!sheet) {
        SpreadsheetApp.getUi().alert('尚無安全日誌', '目前沒有任何登入記錄。', SpreadsheetApp.getUi().ButtonSet.OK);
        return { success: true };
    }
    ss.setActiveSheet(sheet);
    return { success: true };
}

/**
 * 檢查試算表權限
 */
function checkSheetPermissions() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var editors = ss.getEditors().map(function (u) { return u.getEmail(); });
    var viewers = ss.getViewers().map(function (u) { return u.getEmail(); });
    var access = ss.getSharingAccess();
    var permission = ss.getSharingPermission();

    var msg = '【分享存取等級】' + access + '\n' +
        '【分享權限】' + permission + '\n\n' +
        '【編輯者】(' + editors.length + ')\n' + (editors.join('\n') || '(無)') + '\n\n' +
        '【檢視者】(' + viewers.length + ')\n' + (viewers.join('\n') || '(無)');

    SpreadsheetApp.getUi().alert('試算表權限報告', msg, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: true };
}

/**
 * 解除特定學號鎖定
 */
function unlockSpecificStudent() {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt('解除帳號鎖定', '請輸入要解鎖的學號：', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return { success: true };

    var studentId = response.getResponseText().trim();
    if (!studentId) {
        ui.alert('錯誤', '請輸入有效的學號。', ui.ButtonSet.OK);
        return { success: false };
    }

    var cache = CacheService.getScriptCache();
    cache.remove('LOCK_' + studentId);
    cache.remove('ATT_FAIL_' + studentId);

    ui.alert('解鎖成功', '學號 ' + studentId + ' 的鎖定已解除。', ui.ButtonSet.OK);
    Security.log(studentId, 'ADMIN_UNLOCK', 'Manual unlock by admin', 'ADMIN', Session.getActiveUser().getEmail());
    return { success: true };
}

/**
 * 緊急解除全部鎖定
 */
function emergencyUnlockAll() {
    var ui = SpreadsheetApp.getUi();
    var confirm = ui.alert('確認操作', '確定要解除所有帳號鎖定與全域恐慌模式嗎？\n此操作無法復原。', ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) return { success: true };

    var cache = CacheService.getScriptCache();
    // Clear global panic
    cache.remove('GLOBAL_PANIC');
    cache.remove('GLOBAL_FAIL_COUNT');

    // Note: CacheService does not support listing keys.
    // Individual LOCK_ keys will expire naturally (600s).
    // For immediate effect, we clear all script cache.
    // This is safe because all cached data is regenerable.

    ui.alert('緊急解鎖完成', '全域恐慌模式已解除。\n個別帳號鎖定將在 10 分鐘內自動失效。', ui.ButtonSet.OK);
    Security.log('ALL', 'EMERGENCY_UNLOCK', 'Emergency unlock by admin', 'ADMIN', Session.getActiveUser().getEmail());
    return { success: true };
}
