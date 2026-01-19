var CacheService = {
    scriptCache: {},
    getScriptCache: function () {
        return {
            get: (key) => this.scriptCache[key],
            put: (key, value, duration) => { this.scriptCache[key] = value; },
            remove: (key) => { delete this.scriptCache[key]; }
        };
    },
    getUserCache: function () {
        return {
            get: (key) => '123', // Always correct captcha for this test
            remove: (key) => { },
            put: (key, val) => { }
        };
    }
};

var Logger = {
    log: console.log
};

// Config
const CONFIG = {
    LOCKOUT_ATTEMPTS: 3,
    LOCKOUT_DURATION: 600
};

// Mock Data finding
function findStudentData(id) {
    if (id === '12345') {
        return { '學號': '12345', '查詢碼': '9999' };
    }
    return null;
}

// === PASTE LOGIC FROM Code.js ===
function login(studentId, password, captchaToken, captchaAnswer) {
    const cache = CacheService.getScriptCache();
    const userCache = CacheService.getUserCache();

    studentId = String(studentId).trim();

    const lockKey = 'LOCK_' + studentId;
    const attemptKey = 'ATTEMPT_' + studentId;

    if (cache.get(lockKey)) {
        return { success: false, message: 'LOCKED_MSG', locked: true };
    }

    // Skip captcha check for mock

    try {
        const studentData = findStudentData(studentId);

        if (!studentData) {
            const isLockedNow = handleFailedAttempt(studentId, cache, attemptKey, lockKey);
            if (isLockedNow) {
                return { success: false, message: 'LOCKED_MSG', locked: true };
            }
            return { success: false, message: 'WRONG_ID' };
        }

        if (studentData['查詢碼'] != password) {
            const isLockedNow = handleFailedAttempt(studentId, cache, attemptKey, lockKey);
            if (isLockedNow) {
                return { success: false, message: 'LOCKED_MSG', locked: true };
            }
            return { success: false, message: 'WRONG_PWD' };
        }

        cache.remove(attemptKey);
        return { success: true, data: studentData };

    } catch (e) {
        console.log(e);
        return { success: false };
    }
}

function handleFailedAttempt(studentId, cache, attemptKey, lockKey) {
    let attempts = Number(cache.get(attemptKey)) || 0;
    attempts++;
    cache.put(attemptKey, attempts.toString(), CONFIG.LOCKOUT_DURATION);

    if (attempts >= CONFIG.LOCKOUT_ATTEMPTS) {
        cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
        return true;
    }
    return false;
}

// === RUN TESTS ===
console.log("Test 1: Login Attempt 1 (Valid ID, Wrong Pwd)");
console.log(login('12345', '0000', 'token', '123').message);

console.log("Test 2: Login Attempt 2 (Valid ID, Wrong Pwd)");
console.log(login('12345', '0000', 'token', '123').message);

console.log("Test 3: Login Attempt 3 (Valid ID, Wrong Pwd) -> SHOULD LOCK");
var res3 = login('12345', '0000', 'token', '123');
console.log(res3.message, "Locked:", res3.locked);

console.log("Test 4: Login Attempt 4 (Already Locked)");
var res4 = login('12345', '0000', 'token', '123');
console.log(res4.message, "Locked:", res4.locked);
