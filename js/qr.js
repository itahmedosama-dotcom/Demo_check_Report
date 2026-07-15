// ============================================================
// أدوات QR الخاصة بالتقارير
// - توليد رابط تحقق مباشر لكل تقرير (نفس رابط report_result.html
//   اللي بتوصله صفحة view.html بعد البحث اليدوي)
// - عرض QR كبير للعميل يمسحه بكاميرا موبايله ويفتح النتيجة مباشرة
// - إرسال التقرير عبر واتساب لصاحب التقرير مع رابط التحقق + صورة QR
//
// ⚠️ ملحوظة مهمة (حدود واتساب على المواقع الثابتة):
// رابط wa.me بيفتح شات واتساب برسالة نصية جاهزة بس، ومفيش طريقة
// (من غير باكيند واتساب Business API مدفوع) نخلي الصورة تترفق تلقائيًا
// جوه الشات. فالحل العملي هنا: بننزّل صورة الـ QR أوتوماتيك على جهاز
// الموظف، وبنفتح شات واتساب برسالة فيها رابط التحقق، وعلى الموظف
// يرفق الصورة اللي اتنزّلت يدويًا في نفس الشات (خطوة واحدة بسيطة).
// ============================================================

// يبني رابط مباشر لصفحة نتيجة التقرير — بيفتح النتيجة على طول من غير بحث يدوي
function buildReportVerifyLink(report) {
    const base = new URL('report_result.html', window.location.href);
    const params = new URLSearchParams({
        passport: (report && report.passport) || '',
        report_date: (report && report.report_date) || ''
    });
    base.search = params.toString();
    return base.toString();
}

// يحوّل رقم تليفون سعودي محلي (05xxxxxxxx) لصيغة دولية يفهمها wa.me (966xxxxxxxxx)
function normalizePhoneForWhatsApp(rawPhone) {
    let digits = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = '966' + digits.slice(1);
    else if (digits.length === 9 && digits.startsWith('5')) digits = '966' + digits;
    return digits;
}

// يرسم QR جوه أي canvas element، ويرجع true/false لو نجح
async function drawQrOnCanvas(canvas, text) {
    if (typeof QRCode === 'undefined') {
        console.error('QR generation error: مكتبة QRCode لم يتم تحميلها (تأكد من الاتصال بالإنترنت).');
        return false;
    }
    try {
        await QRCode.toCanvas(canvas, text, {
            width: 260,
            margin: 2,
            color: { dark: '#1f7a2e', light: '#ffffff' }
        });
        return true;
    } catch (e) {
        console.error('QR generation error:', e);
        return false;
    }
}

// يفتح مودال فيه QR كبير + رابط التحقق + أزرار تنزيل/نسخ — للعميل يمسحه بنفسه
async function showReportQr(report) {
    if (!report) return;
    const link = buildReportVerifyLink(report);

    const modal = document.getElementById('qrModal');
    const canvas = document.getElementById('qrCanvas');
    const linkEl = document.getElementById('qrLinkText');
    const nameEl = document.getElementById('qrPersonName');

    nameEl.textContent = report.name_ar || report.name_en || '';
    linkEl.textContent = link;
    linkEl.href = link;

    const ok = await drawQrOnCanvas(canvas, link);
    if (!ok) {
        showToast(t('qr.genError'), true);
        return;
    }

    modal.dataset.link = link;
    modal.style.display = 'block';
}

function closeQrModal() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.style.display = 'none';
}

function downloadQrCanvas(filename) {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename || 'report-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function copyQrLink() {
    const modal = document.getElementById('qrModal');
    const link = (modal && modal.dataset.link) || '';
    if (!link) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => showToast(t('qr.copySuccess')))
            .catch(() => showToast(t('qr.copyFail'), true));
    } else {
        showToast(t('qr.copyFail'), true);
    }
}

// يغلق المودال لو المستخدم دوس بره الكارت
window.addEventListener('click', function (e) {
    const modal = document.getElementById('qrModal');
    if (modal && e.target === modal) modal.style.display = 'none';
});

// إرسال التقرير عبر واتساب لصاحب التقرير: بينزّل صورة QR أوتوماتيك، وبيفتح شات
// واتساب برسالة جاهزة فيها رابط التحقق المباشر + تنبيه لإرفاق الصورة يدويًا
async function sendReportViaWhatsApp(report) {
    if (!report) return;

    const phone = normalizePhoneForWhatsApp(report.phone);
    if (!phone) {
        showToast(t('qr.noPhone'), true);
        return;
    }

    const link = buildReportVerifyLink(report);
    const isValid = report.report_status === 'valid';
    const statusText = isValid ? t('qr.waStatusValid') : t('qr.waStatusNotValid');

    const message =
        `${t('qr.waGreeting', { name: report.name_ar || report.name_en || '' })}\n` +
        `${t('qr.waStatusLine', { date: report.report_date || '', status: statusText })}\n\n` +
        `${t('qr.waCheckLine')}\n${link}\n\n` +
        `${t('qr.waQrLine')}\n\n` +
        `${t('common.orgName')}`;

    // نولّد صورة QR وننزّلها أوتوماتيك عشان الموظف يقدر يرفقها يدويًا في نفس شات واتساب
    const tempCanvas = document.createElement('canvas');
    const ok = await drawQrOnCanvas(tempCanvas, link);
    if (ok) {
        const a = document.createElement('a');
        a.href = tempCanvas.toDataURL('image/png');
        a.download = `qr-${(report.passport || 'report')}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast(t('qr.downloadedNotice'));
    } else {
        showToast(t('qr.downloadFailedFallback'), true);
    }

    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    setTimeout(() => window.open(waLink, '_blank'), ok ? 900 : 0);
}
