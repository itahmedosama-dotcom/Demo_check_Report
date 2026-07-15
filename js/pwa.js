// ============================================================
// تسجيل الـ Service Worker + زرار "تثبيت التطبيق" على الموبايل/الكمبيوتر
// ============================================================
//
// ⚠️ ملحوظة مهمة: حدث beforeinstallprompt (اللي بيسمح بزرار تثبيت تلقائي حقيقي)
// **مش مدعوم خالص** في Safari على آيفون/آيباد، ولا في متصفحات كتير على أندرويد
// (Firefox، Samsung Internet أحيانًا، ومتصفحات التطبيقات المدمجة زي واتساب/فيسبوك).
// لو اعتمدنا عليه بس، الزرار مش هيظهر خالص في الحالات دي — وده سبب المشكلة.
// الحل: نكتشف الحالة ونعرض زرار "تثبيت" بيفتح تعليمات مناسبة للمتصفح لو الحدث مش هيشتغل.
// ============================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 'sw.js' لازم يكون دايمًا في جذر الموقع عشان يقدر يتحكم في كل الصفحات
        const base = window.location.pathname.replace(/[^/]+$/, '');
        navigator.serviceWorker.register(base + 'sw.js').catch(() => {
            // تجاهل: لو فشل التسجيل (مثلاً الموقع مش شغال على HTTPS)، الموقع يفضل شغال عادي بدون PWA
        });
    });
}

let deferredInstallPrompt = null;

// هل التطبيق شغال بالفعل كتطبيق مثبّت (مش داخل تاب المتصفح العادي)؟
function isRunningStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true; // iOS Safari القديم
}

function detectPlatform() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return { isIOS, isAndroid, isSafari };
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallButton('auto');
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallButton();
});

async function handleInstallClick(mode) {
    if (mode === 'auto' && deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        hideInstallButton();
        return;
    }
    // مفيش حدث تلقائي متاح (آيفون أو متصفح مش بيدعم beforeinstallprompt) -> نوريه التعليمات يدويًا
    showInstallInstructions();
}

// نفس تصميم زرار الواتساب بالظبط: شريط نص + دائرة أيقونة، بس على الجنب التاني من الشاشة
function showInstallButton(mode) {
    if (document.getElementById('pwaInstallWidget')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'pwaInstallWidget';
    wrapper.className = 'pwa-widget';
    wrapper.dataset.mode = mode;
    wrapper.innerHTML = `
        <a href="#" class="pwa-install-pill" data-i18n="pwa.installPill">${t('pwa.installPill')}</a>
        <button type="button" class="pwa-install-circle" aria-label="${t('pwa.installAria')}" data-i18n-aria="pwa.installAria">⬇️</button>
    `;
    wrapper.querySelectorAll('.pwa-install-pill, .pwa-install-circle').forEach(el => {
        el.addEventListener('click', (e) => { e.preventDefault(); handleInstallClick(wrapper.dataset.mode); });
    });
    document.body.appendChild(wrapper);
}

function hideInstallButton() {
    const el = document.getElementById('pwaInstallWidget');
    if (el) el.remove();
}

// تعليمات التثبيت اليدوي لما مفيش زرار تلقائي مدعوم (آيفون بالذات)
function showInstallInstructions() {
    if (document.getElementById('pwaInstructionsModal')) return;
    const { isIOS, isSafari, isAndroid } = detectPlatform();

    let steps;
    if (isIOS) {
        steps = `${t('pwa.iosSteps')}${isSafari ? '' : `<p style="color:var(--text-muted); font-size:13px;">${t('pwa.iosSafariNote')}</p>`}`;
    } else if (isAndroid) {
        steps = t('pwa.androidSteps');
    } else {
        steps = t('pwa.desktopSteps');
    }

    const modal = document.createElement('div');
    modal.id = 'pwaInstructionsModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="width:320px; text-align:center;">
            <p style="font-weight:700; margin-bottom:10px;">${t('pwa.installTitle')}</p>
            ${steps}
            <button type="button" id="pwaInstructionsCloseBtn">${t('pwa.ok')}</button>
        </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('#pwaInstructionsCloseBtn').addEventListener('click', close);
}

// نشغّل المنطق بعد تحميل الصفحة عشان نتأكد إن body جاهز لإضافة الزرار
document.addEventListener('DOMContentLoaded', () => {
    if (isRunningStandalone()) return; // متثبت بالفعل، مفيش داعي للزرار

    const { isIOS } = detectPlatform();

    if (isIOS) {
        // آيفون: مفيش beforeinstallprompt خالص، فنعرض الزرار على طول وهو بيفتح التعليمات اليدوية
        showInstallButton('manual');
        return;
    }

    // غير آيفون: ننتظر شوية لو beforeinstallprompt هيشتغل (Chrome/Edge على أندرويد وويندوز).
    // لو مرت 3 ثواني ومفيش حدث، يبقى المتصفح مش بيدعمه (Firefox، متصفح تطبيقات مدمج...)
    // فنوريه زرار بردو بس بيفتح تعليمات يدوية عامة بدل ما يختفي تمامًا.
    setTimeout(() => {
        if (!deferredInstallPrompt && !document.getElementById('pwaInstallWidget')) {
            showInstallButton('manual');
        }
    }, 3000);
});
