// ============================================================
// مكوّن "كود التحقق" (Captcha) بسيط من جانب المتصفح
// الهدف: تقليل الإدخال العشوائي/سبام من الفورمات، مش حماية أمنية قوية.
// ============================================================

const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // من غير أحرف/أرقام ملخبطة زي O,0,I,1,L

function generateCaptchaCode(length = 4) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    }
    return code;
}

/**
 * يفعّل مكوّن الكابتشا جوه أي فورم.
 * prefix: بادئة الـ id بتاعة العناصر في الـ HTML (مثلاً 'login' أو 'search').
 * محتاج العناصر دي موجودة في الصفحة:
 *   #{prefix}CaptchaCode, #{prefix}CaptchaInput, #{prefix}CaptchaRefresh, #{prefix}CaptchaCopy
 */
function initCaptcha(prefix) {
    let currentCode = generateCaptchaCode();

    const codeEl = document.getElementById(prefix + 'CaptchaCode');
    const inputEl = document.getElementById(prefix + 'CaptchaInput');
    const refreshBtn = document.getElementById(prefix + 'CaptchaRefresh');
    const copyBtn = document.getElementById(prefix + 'CaptchaCopy');

    function render() {
        codeEl.innerHTML = currentCode.split('').map(ch => `<span>${ch}</span>`).join('');
        inputEl.value = '';
    }

    function regenerate() {
        currentCode = generateCaptchaCode();
        render();
    }

    refreshBtn.addEventListener('click', regenerate);

    // زرار النسخ/اللصق: أهم حاجة إنه يحط الكود في الحقل على طول (ده اللي المستخدم فعليًا محتاجه)،
    // وبعدين نحاول كمان ننسخه للكليپبورد كخطوة إضافية (ممكن تفشل في متصفحات/سياقات معينة، وده عادي).
    copyBtn.addEventListener('click', () => {
        inputEl.value = currentCode;
        inputEl.focus();

        const original = copyBtn.textContent;
        copyBtn.textContent = '✅';
        setTimeout(() => { copyBtn.textContent = original; }, 1200);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentCode).catch(() => {
                // تجاهل: الكود اتحط في الحقل فعلاً فوق، وده الأهم
            });
        }
    });

    render();

    return {
        // بيتحقق من الكود، ولو غلط بيولّد كود جديد تلقائيًا
        verify() {
            const ok = inputEl.value.trim().toUpperCase() === currentCode;
            if (!ok) regenerate();
            return ok;
        },
        regenerate
    };
}

function captchaWidgetHtml(prefix) {
    return `
    <div class="captcha-box">
        <label data-i18n="captcha.label">${t('captcha.label')}</label>
        <div class="captcha-row">
            <button type="button" class="captcha-icon-btn" id="${prefix}CaptchaRefresh" title="${t('captcha.refreshTitle')}" data-i18n-title="captcha.refreshTitle">🔄</button>
            <button type="button" class="captcha-icon-btn" id="${prefix}CaptchaCopy" title="${t('captcha.copyTitle')}" data-i18n-title="captcha.copyTitle">📋</button>
            <div class="captcha-code" id="${prefix}CaptchaCode" dir="ltr"></div>
        </div>
        <input type="text" id="${prefix}CaptchaInput" placeholder="${t('captcha.placeholder')}" data-i18n-ph="captcha.placeholder" autocomplete="off" dir="ltr" required>
    </div>`;
}
