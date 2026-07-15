// ============================================================
// فوتر موحّد لكل صفحات الموقع — حقوق الملكية الفكرية وبيانات التواصل
// ============================================================
async function renderSiteFooter() {
    if (document.getElementById('siteFooter')) return;
    const year = new Date().getFullYear();
    const defaultText = `${t('footer.copyrightDefault', { year })}`;
    const defaultPhone1 = '01384679999';
    const defaultPhone2 = '05909331883';
    const defaultEmail = 'info@nahjalshifaa.com';

    const footer = document.createElement('footer');
    footer.id = 'siteFooter';
    footer.className = 'site-footer';
    footer.innerHTML = `
        <div class="site-footer-inner">
            <p class="footer-copyright" id="footerCopyrightText">${defaultText}</p>
            <p class="footer-contact">
                <span data-i18n="footer.contactPrefix">${t('footer.contactPrefix')}</span>
                <span class="footer-contact-item">📞 <a href="tel:${defaultPhone1}" id="footerPhone1">${defaultPhone1}</a> - <a href="tel:${defaultPhone2}" id="footerPhone2">${defaultPhone2}</a></span>
                <span class="footer-contact-item">✉️ <a href="mailto:${defaultEmail}" id="footerEmail">${defaultEmail}</a></span>
            </p>
        </div>`;
    document.body.appendChild(footer);

    // لو الأدمن حط قيم مخصصة (نص حقوق الملكية / أرقام / إيميل) في الإعدادات، نستخدمها بدل الافتراضي
    try {
        if (typeof sheetsGetSettings === 'function') {
            const settings = await sheetsGetSettings();

            const customText = (settings.copyright_text || '').toString().trim();
            if (customText) {
                const el = document.getElementById('footerCopyrightText');
                el.textContent = customText;
                el.dataset.custom = '1';
            }

            const phone1 = (settings.footer_phone1 || '').toString().trim();
            if (phone1) {
                const el = document.getElementById('footerPhone1');
                el.textContent = phone1;
                el.href = 'tel:' + phone1.replace(/[^0-9+]/g, '');
            }

            const phone2 = (settings.footer_phone2 || '').toString().trim();
            if (phone2) {
                const el = document.getElementById('footerPhone2');
                el.textContent = phone2;
                el.href = 'tel:' + phone2.replace(/[^0-9+]/g, '');
            }

            const email = (settings.footer_email || '').toString().trim();
            if (email) {
                const el = document.getElementById('footerEmail');
                el.textContent = email;
                el.href = 'mailto:' + email;
            }
        }
    } catch (e) {
        // تجاهل: تفضل القيم الافتراضية شغالة لو حصل أي خطأ في تحميل الإعدادات
    }
}

// لو مفيش نص حقوق ملكية مخصص من الأدمن، نعيد توليد النص الافتراضي باللغة
// الجديدة كل ما المستخدم يبدّل اللغة (السنة بتتحسب تلقائي وقت كل نداء)
window.addEventListener('nsh:langchange', function () {
    const el = document.getElementById('footerCopyrightText');
    if (el && !el.dataset.custom) {
        el.textContent = t('footer.copyrightDefault', { year: new Date().getFullYear() });
    }
});

document.addEventListener('DOMContentLoaded', renderSiteFooter);
