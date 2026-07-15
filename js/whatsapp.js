// ============================================================
// زرار واتساب العائم — بيقرا الرقم من شيت "الإعدادات" في Google Sheets
// عشان يتغيّر بسهولة من صفحة الإعدادات من غير ما حد يلمس الكود
// ============================================================

const WA_ICON_SVG = `
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.22.6 4.36 1.74 6.24L4 29l7.94-1.66a12.02 12.02 0 0 0 4.08.72h.01c6.63 0 12.02-5.4 12.02-12.03C28.05 8.4 22.66 3 16.02 3z" fill="#fff"/>
<path d="M22.6 18.32c-.34-.17-2.02-1-2.33-1.1-.31-.12-.54-.17-.77.17-.23.34-.88 1.1-1.08 1.33-.2.23-.4.26-.74.09-.34-.17-1.43-.53-2.72-1.68-1-.9-1.68-2-1.88-2.34-.2-.34-.02-.52.15-.69.15-.15.34-.4.5-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.77-1.87-1.06-2.56-.28-.67-.56-.58-.77-.59h-.66c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.86 0 1.69 1.23 3.32 1.4 3.55.17.23 2.42 3.7 5.86 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.3-1.62.29-.8.29-1.48.2-1.62-.09-.14-.31-.23-.65-.4z" fill="#25D366"/>
</svg>`;

async function renderWhatsAppWidget() {
    try {
        const settings = (typeof sheetsGetSettings === 'function') ? await sheetsGetSettings() : {};
        const rawNumber = (settings.whatsapp_number || '').toString().trim();
        if (!rawNumber) return; // مفيش رقم متسجل في الإعدادات، فمنعرضش الزرار خالص

        const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
        if (!cleanNumber) return;

        const message = (settings.whatsapp_message || 'مرحبًا، أرغب في الاستفسار').toString();
        const link = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'wa-widget';
        wrapper.innerHTML = `
            <a href="${link}" target="_blank" rel="noopener" class="wa-chat-pill" data-i18n="wa.chatPill">${t('wa.chatPill')}</a>
            <a href="${link}" target="_blank" rel="noopener" class="wa-float-btn" aria-label="${t('wa.ariaContact')}" data-i18n-aria="wa.ariaContact">${WA_ICON_SVG}</a>
        `;
        document.body.appendChild(wrapper);
    } catch (e) {
        console.error('renderWhatsAppWidget error:', e);
    }
}

document.addEventListener('DOMContentLoaded', renderWhatsAppWidget);
