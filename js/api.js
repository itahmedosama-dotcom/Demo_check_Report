// ============================================================
// طبقة الاتصال بـ Google Sheets (بديل sheets_api.php)
// ============================================================

async function sheetsGet(sheetName) {
    try {
        const url = `${API_URL}?sheet=${encodeURIComponent(sheetName)}&key=${encodeURIComponent(API_KEY)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('sheetsGet error:', e);
        return [];
    }
}

async function sheetsSave(sheetName, data) {
    try {
        const payload = JSON.stringify({
            key: API_KEY,
            sheet: sheetName,
            data: data
        });
        // نستخدم text/plain عشان نتفادى مشكلة CORS preflight مع Apps Script
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload
        });
        return res.ok;
    } catch (e) {
        console.error('sheetsSave error:', e);
        return false;
    }
}

// ------- التقارير -------
async function sheetsGetData() { return sheetsGet('reports'); }
async function sheetsSaveData(data) { return sheetsSave('reports', data); }

// ------- المستخدمين -------
async function sheetsGetUsers() { return sheetsGet('users'); }
async function sheetsSaveUsers(users) { return sheetsSave('users', users); }

// ============================================================
// إدارة "الجلسة" (بديل session_start في PHP) — تُخزَّن في sessionStorage
// ============================================================

const SESSION_KEY = 'nsh_session';

function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch (e) {
        return null;
    }
}

function setSession(username, role) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        loggedin: true,
        username: username,
        role: role
    }));
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

// يحمي الصفحة: لو مش مسجل دخول يرجّع لصفحة اللوجين
function requireLogin() {
    const s = getSession();
    if (!s || !s.loggedin) {
        window.location.href = 'index.html';
        return null;
    }
    return s;
}

// يحمي صفحة الأدمن فقط
function requireAdmin() {
    const s = requireLogin();
    if (s && s.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return null;
    }
    return s;
}

function logout() {
    clearSession();
    window.location.href = 'index.html';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}
