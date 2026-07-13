// ============================================================
// طبقة الاتصال بـ Google Sheets (بديل sheets_api.php)
// ============================================================

async function sheetsGet(sheetName) {
    try {
        const url = `${API_URL}?sheet=${encodeURIComponent(sheetName)}&key=${encodeURIComponent(API_KEY)}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('sheetsGet: HTTP', res.status);
            return [];
        }
        const data = await res.json();
        // Apps Script بيرجع 200 حتى لو فيه خطأ منطقي (زي مفتاح غلط)،
        // فلازم نتأكد إن الرد مش object فيه error بدل array البيانات
        if (data && !Array.isArray(data) && data.error) {
            console.error('sheetsGet: server error ->', data.error);
            return [];
        }
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
        if (!res.ok) {
            console.error('sheetsSave: HTTP', res.status);
            return false;
        }
        // برضو هنا: الرد بيرجع 200 حتى لو فيه خطأ منطقي، فلازم نتحقق من الجسم نفسه
        const body = await res.json().catch(() => null);
        if (!body || body.error) {
            console.error('sheetsSave: server error ->', body && body.error);
            return false;
        }
        return body.status === 'ok';
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

// ------- الإعدادات (رقم واتساب وغيره) -------
// الشيت بيتخزن كصف واحد بس، فبنتعامل معاه كـ object مش array
async function sheetsGetSettings() {
    const rows = await sheetsGet('settings');
    return rows[0] || {};
}
async function sheetsSaveSettings(settingsObj) {
    return sheetsSave('settings', [settingsObj]);
}

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
