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

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(currentCode);
            const original = copyBtn.textContent;
            copyBtn.textContent = '✅';
            setTimeout(() => { copyBtn.textContent = original; }, 1200);
        } catch (e) {
            // لو الكليپبورد مش متاح، نحط الكود مباشرة في الحقل
            inputEl.value = currentCode;
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

function captchaWidgetHtml(prefix, hint) {
    return `
    <div class="captcha-box">
        <label>اكتب الكود اللي جنبك (عشان نتأكد إنك مش SPAM ${hint || ''})</label>
        <div class="captcha-row">
            <button type="button" class="captcha-icon-btn" id="${prefix}CaptchaRefresh" title="تحديث الكود">🔄</button>
            <button type="button" class="captcha-icon-btn" id="${prefix}CaptchaCopy" title="نسخ الكود">📋</button>
            <div class="captcha-code" id="${prefix}CaptchaCode"></div>
        </div>
        <input type="text" id="${prefix}CaptchaInput" placeholder="اكتب الكود هنا أو دوس انسخ" autocomplete="off" required>
    </div>`;
}
