// ============================================================
// هوية الشركة (الشعار / اسم الشركة / الألوان) — بتتطبّق تلقائيًا
// في كل صفحات الموقع بمجرد ما الأدمن يحفظها من صفحة الإعدادات
// (users.html). ده اللي بيخلّي نفس المشروع يتستخدم مع أي شركة
// تانية بس بتغيير البيانات دي، من غير ما تلمس أي كود أو صور.
// ============================================================

// تغميق/تفتيح لون HEX بنسبة معينة (سالب = أغمق، موجب = أفتح)
// مستخدمة عشان نولّد تلقائيًا تدرجات الألوان (hover / dark) من لون واحد بس يختاره الأدمن
function nshShadeColor(hex, percent) {
    try {
        let h = String(hex).replace('#', '').trim();
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
        const num = parseInt(h, 16);
        let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
        const target = percent < 0 ? 0 : 255;
        const p = Math.abs(percent);
        r = Math.round((target - r) * p) + r;
        g = Math.round((target - g) * p) + g;
        b = Math.round((target - b) * p) + b;
        const clamp = v => Math.max(0, Math.min(255, v));
        return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return hex;
    }
}

// بتطبّق كائن إعدادات الهوية على الصفحة الحالية. آمنة تتنادى أكتر من مرة
// (مثلاً بعد الحفظ في صفحة الإعدادات نفسها عشان يظهر تغيير فوري).
function applyBranding(settings) {
    settings = settings || {};

    // ---------- اسم الشركة ----------
    const name = (settings.company_name || '').toString().trim();
    if (name) {
        document.querySelectorAll('[data-i18n="common.orgName"]').forEach(el => {
            el.textContent = name;
            // نشيل data-i18n عشان تبديل اللغة (عربي/إنجليزي) ما يرجعش الاسم الافتراضي فوق الاسم المخصص
            el.removeAttribute('data-i18n');
        });
        document.querySelectorAll('img.logo-img').forEach(img => { img.alt = name; });
        window.__nshCompanyName = name;
    }

    // ---------- الشعار ----------
    const logo = (settings.logo_data || '').toString().trim();
    if (logo) {
        document.querySelectorAll('img.logo-img').forEach(img => { img.src = logo; });
    }

    // ---------- الألوان ----------
    const root = document.documentElement.style;
    const primary = (settings.color_primary || '').toString().trim();
    const secondary = (settings.color_secondary || '').toString().trim();
    const accent = (settings.color_accent || '').toString().trim();

    if (primary) {
        root.setProperty('--green', primary);
        root.setProperty('--green-dark', nshShadeColor(primary, -0.28));
        root.setProperty('--green-light', nshShadeColor(primary, 0.32));
        root.setProperty('--green-bg', nshShadeColor(primary, 0.92));
    }
    if (secondary) {
        root.setProperty('--blue', secondary);
        root.setProperty('--blue-dark', nshShadeColor(secondary, -0.28));
    }
    if (accent) {
        root.setProperty('--orange', accent);
        root.setProperty('--orange-dark', nshShadeColor(accent, -0.28));
    }
}

// ============================================================
// كاش محلي (localStorage) لآخر هوية اتحمّلت بنجاح من الشيت على هذا المتصفح.
// بيتطبّق فورًا (قبل حتى ما نستنى رد الشبكة) عشان الزائر يشوف اسم/شعار/ألوان
// الشركة الحقيقية على طول بدل ما يشوف الهوية الافتراضية المكتوبة في الكود
// لثانية أو اتنين لحد ما يوصل رد Apps Script. لسه بنعمل نداء شبكة عادي بعد
// كده عشان نتأكد إن الهوية المعروضة محدّثة (لو الأدمن غيّرها من جهاز تاني).
// ============================================================
const BRANDING_CACHE_KEY = 'nsh_branding_cache';

function applyCachedBrandingImmediately() {
    try {
        const raw = localStorage.getItem(BRANDING_CACHE_KEY);
        if (!raw) return;
        const settings = JSON.parse(raw);
        window.__nshSettingsCache = settings;
        applyBranding(settings);
    } catch (e) {
        // كاش تالف أو localStorage مش متاح: تجاهل واستنى النداء الفعلي من الشبكة
    }
}

// بتجيب إعدادات الهوية من الشيت وتطبّقها على الصفحة الحالية
async function loadAndApplyBranding() {
    try {
        if (typeof sheetsGetSettings !== 'function') return;
        const settings = await sheetsGetSettings();
        window.__nshSettingsCache = settings;
        applyBranding(settings);
        try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(settings)); } catch (e) { /* تجاهل */ }
    } catch (e) {
        // تجاهل: تفضل هوية الموقع الافتراضية (المكتوبة في الكود) شغالة لو حصل أي خطأ
        console.error('branding load error:', e);
    }
}

// بتتنفذ فورًا وقت تحميل السكريبت (مش مستنية DOMContentLoaded) عشان تسبق
// أي فلاش للهوية الافتراضية. آمنة لأن ملف branding.js بيتحمّل في آخر الصفحة
// (بعد ما العناصر المطلوبة زي img.logo-img تكون موجودة بالفعل في الـ HTML).
applyCachedBrandingImmediately();
document.addEventListener('DOMContentLoaded', loadAndApplyBranding);

// لو المستخدم بدّل اللغة، نتأكد إن الاسم المخصص (لو موجود) يفضل زي ما هو
window.addEventListener('nsh:langchange', function () {
    if (window.__nshSettingsCache) applyBranding(window.__nshSettingsCache);
});
