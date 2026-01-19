/**
 * Security Simulation: Brute Force Attack Test
 * 
 * This script calls a mock version of the `login` function found in Code.js
 * to simulate an attacker trying to guess a 4-digit code.
 */

// --- MOCKS for Google Apps Script Services ---
const mockCache = {};
const CacheService = {
    getScriptCache: () => ({
        get: (key) => mockCache[key] || null,
        put: (key, val, sec) => { mockCache[key] = val; console.log(`[Cache] Set ${key}=${val} (Expire: ${sec}s)`); },
        remove: (key) => { delete mockCache[key]; }
    }),
    getUserCache: () => ({
        get: (key) => mockCache[key] || null,
        put: (key, val, sec) => { mockCache[key] = val; },
        remove: (key) => { delete mockCache[key]; }
    })
};

const Utilities = { getUuid: () => 'uuid-' + Math.random() };
const Logger = { log: (msg) => console.log('[Log]', msg) };

// --- LOGIC FROM Code.js (Adapted for Node.js test) ---
const CONFIG = { LOCKOUT_ATTEMPTS: 3, LOCKOUT_DURATION: 600 };
let MOCK_DB = { '10101': { '查詢碼': '1234' } }; // Target Student

function login(studentId, password, captchaToken, captchaAnswer) {
    const cache = CacheService.getScriptCache();
    const userCache = CacheService.getUserCache();
    studentId = String(studentId).trim();

    // 1. Check Lockout
    const lockKey = 'LOCK_' + studentId;
    const attemptKey = 'ATTEMPT_' + studentId;

    if (cache.get(lockKey)) {
        console.log(`>>> BLOCKED: Student ${studentId} is locked out.`);
        return { success: false, locked: true, message: 'Locked' };
    }

    // 2. Mock Captcha Check (Assume attacker solves it for brute force test)
    // In real brute force, solving captcha 1000s of times is hard/expensive.
    // We assume they bypass/solve it to test the PASSWORD strength/lockout.

    // 3. Password Check
    const studentData = MOCK_DB[studentId];
    if (!studentData || studentData['查詢碼'] != password) {
        console.log(`>>> FAILED: Password ${password} incorrect.`);
        const res = handleFailedAttempt(studentId, cache, attemptKey, lockKey);
        return { success: false, locked: res.locked, message: 'Wrong Pwd' };
    }

    return { success: true, message: 'Login Success!' };
}

function handleFailedAttempt(id, cache, attKey, lockKey) {
    let attempts = Number(cache.get(attKey)) || 0;
    attempts++;
    cache.put(attKey, attempts.toString(), CONFIG.LOCKOUT_DURATION);
    console.log(`    Attempts: ${attempts}/${CONFIG.LOCKOUT_ATTEMPTS}`);

    const locked = attempts >= CONFIG.LOCKOUT_ATTEMPTS;
    if (locked) {
        console.log(`    !!! LOCKING ACCOUNT !!!`);
        cache.put(lockKey, 'LOCKED', CONFIG.LOCKOUT_DURATION);
    }
    return { locked: locked };
}

// --- ATTACK SIMULATION ---
async function runAttack() {
    console.log("=== STARTING BRUTE FORCE SIMULATION ===");
    const targetId = '10101';
    const passwordsToTry = ['0000', '1111', '2222', '3333', '1234']; // '1234' is correct

    for (let i = 0; i < passwordsToTry.length; i++) {
        const pwd = passwordsToTry[i];
        console.log(`\nAttack #${i + 1}: Trying password '${pwd}'...`);

        const result = login(targetId, pwd, 'token', 'ans');

        if (result.success) {
            console.log("\n[DANGER] PASSWORD CRACKED!");
            break;
        }

        if (result.locked) {
            console.log("\n[SECURE] Attack stopped by lockout mechanism.");
            break;
        }

        // Slight delay to simulate network
        await new Promise(r => setTimeout(r, 100));
    }
}

runAttack();
