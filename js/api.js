// ============================================================
// طبقة الاتصال بـ Google Sheets (بديل sheets_api.php)
// ============================================================

// بترجع true لو آخر قراءة فشلت (رابط/مفتاح ناقص، أو خطأ شبكة، أو مفتاح غلط)
// عشان الصفحات (زي نتيجة QR) تفرّق بين "مفيش تقرير فعلاً" و"النظام مش متصل أصلًا"
window.__nshLastFetchFailed = false;

async function sheetsGet(sheetName) {
    if (!API_URL || !API_KEY) {
        console.error('sheetsGet: API_URL/API_KEY غير مضبوطين في js/config.js');
        window.__nshLastFetchFailed = true;
        return [];
    }
    try {
        const url = `${API_URL}?sheet=${encodeURIComponent(sheetName)}&key=${encodeURIComponent(API_KEY)}`;
        // مهلة قصوى 15 ثانية: لو الاتصال بطيء جدًا أو النت واقف، بنوقف الانتظار
        // ونظهر رسالة خطأ واضحة بدل ما تفضل الصفحة معلقة على "جاري البحث" للأبد
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
            console.error('sheetsGet: HTTP', res.status);
            window.__nshLastFetchFailed = true;
            return [];
        }
        const data = await res.json();
        // Apps Script بيرجع 200 حتى لو فيه خطأ منطقي (زي مفتاح غلط)،
        // فلازم نتأكد إن الرد مش object فيه error بدل array البيانات
        if (data && !Array.isArray(data) && data.error) {
            console.error('sheetsGet: server error ->', data.error);
            window.__nshLastFetchFailed = true;
            return [];
        }
        window.__nshLastFetchFailed = false;
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('sheetsGet error:', e);
        window.__nshLastFetchFailed = true;
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
// ------------------------------------------------------------
// ملحوظة أداء: أكتر من مكان في نفس الصفحة بينادي sheetsGetSettings() لوحده
// (زي js/branding.js وكمان كود الصفحة نفسها)، فلو نادوا في نفس اللحظة تقريبًا
// كانوا هيعملوا نداءين منفصلين لـ Apps Script لنفس البيانات بالظبط. هنا بنخزن
// الـ Promise نفسه لمدة ثانيتين، فأي نداء تاني بيحصل في نفس اللحظة بياخد نفس
// النتيجة من غير ما يعمل رحلة شبكة تانية.
// ------------------------------------------------------------
let __nshSettingsPromise = null;
let __nshSettingsPromiseTime = 0;
async function sheetsGetSettings() {
    const now = Date.now();
    if (__nshSettingsPromise && (now - __nshSettingsPromiseTime) < 2000) {
        return __nshSettingsPromise;
    }
    __nshSettingsPromiseTime = now;
    __nshSettingsPromise = sheetsGet('settings').then(rows => rows[0] || {});
    return __nshSettingsPromise;
}
async function sheetsSaveSettings(settingsObj) {
    return sheetsSave('settings', [settingsObj]);
}

// ------- إرسال إشعار SMS/واتساب فعلي عبر مزود خارجي -------
// بيبعت الطلب لنفس رابط Apps Script بأكشن مختلف (send_notification) بدل حفظ
// شيت، عشان الإرسال الفعلي (وأي مفتاح/توكن لمزود SMS أو واتساب) يفضل حاصل
// من جوه Code.gs نفسه (سيرفر جوجل) مش من كود جوه متصفح الزائر.
async function sendAutoNotification(channel, phone, message) {
    if (!API_URL || !API_KEY) {
        return { ok: false, error: 'api_not_configured' };
    }
    try {
        const payload = JSON.stringify({ key: API_KEY, action: 'send_notification', channel, phone, message });
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || body.error) {
            return { ok: false, error: (body && body.error) || ('http_' + res.status) };
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}

// ------- طلبات تسجيل الموظفين الجدد (بانتظار موافقة الأدمن) -------
async function sheetsGetPending() { return sheetsGet('pending_users'); }
async function sheetsSavePending(rows) { return sheetsSave('pending_users', rows); }

// ============================================================
// تشفير كلمة السر (SHA-256) — عشان متتخزنش نص صريح في شيت Google Sheets/Excel
// ============================================================
async function hashPassword(plainPassword) {
    if (!window.crypto || !window.crypto.subtle) {
        // بيحصل غالبًا لو الموقع بيفتح من غير HTTPS (أو من ملف محلي)،
        // لأن المتصفح بيمنع crypto.subtle في السياقات غير الآمنة
        throw new Error('crypto_unavailable');
    }
    const data = new TextEncoder().encode(String(plainPassword));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
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

// يحمي صفحات إدارة النظام: بيسمح بيها لكل من "admin" و"مشرف النظام" (supervisor)
// مشرف النظام عنده كل صلاحيات الأدمن ما عدا: تغيير باسورد حساب أدمن، وتعديل هوية الشركة
function requireAdminOrSupervisor() {
    const s = requireLogin();
    if (s && s.role !== 'admin' && s.role !== 'supervisor') {
        window.location.href = 'dashboard.html';
        return null;
    }
    return s;
}

// تاريخ اليوم بصيغة yyyy-MM-dd (زي صيغة حقل type="date" وصيغة تخزين report_date) عشان مقارنة فترة تشغيل الحساب
function Utilities_todayDateStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

// ============================================================
// إصلاح مشكلة اكسيل الشهيرة: لما رقم موبايل زي "0501234567" يتكتب في
// خلية اكسيل من غير ما العمود يتنسّق كـ "نص" الأول، اكسيل بيتعامل معاه
// كرقم عادي ويشيل الصفر اللي في الأول تلقائيًا (يبقى "501234567").
// المشكلة دي بتحصل جوه اكسيل نفسه قبل حتى ما نستلم الملف، فمفيش طريقة
// نرجع الصفر بيها من غير ما نعرف شكل رقم الموبايل السعودي أصلاً.
// الحل هنا: أي رقم داخل بالظبط 9 أرقام وبيبدأ بـ 5 (يعني شكل رقم موبايل
// سعودي من غير الصفر) بنرجّعله الصفر تلقائيًا. بيتطبق وقت الإضافة اليدوية
// والتعديل ورفع CSV، عشان يفضل شغال بره اكسيل برضو (زي لو حد كتب الرقم
// من غير الصفر بنفسه بالغلط).
// ============================================================
function normalizeSaudiPhone(raw) {
    const digits = String(raw ?? '').trim();
    if (/^5\d{8}$/.test(digits)) {
        return '0' + digits;
    }
    return digits;
}

// ============================================================
// إشعار عائم صغير (Toast) بدل ما نفتح صفحة جديدة أو نستخدم alert()
// ============================================================
let toastTimer = null;
function showToast(message, isError) {
    let el = document.getElementById('nshToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'nshToast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'toast show' + (isError ? ' toast-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3200);
}

// ============================================================
// تصدير أي مصفوفة بيانات (array of objects) إلى ملف Excel (.xls) مباشرة
// من غير ما نفتح صفحة جديدة — بيبدأ التحميل فورًا ويظهر تنبيه بسيط
// ============================================================
function exportArrayToExcel(rows, columns, filename) {
    if (!rows || !rows.length) {
        showToast('⚠️ لا توجد بيانات لتصديرها.', true);
        return;
    }
    let html = '<table border="1"><tr>' + columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('') + '</tr>';
    rows.forEach(r => {
        html += '<tr>' + columns.map(c => `<td>${escapeHtml(r[c.key])}</td>`).join('') + '</tr>';
    });
    html += '</table>';

    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'export.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('✅ تم استخراج الملف بنجاح.');
}
