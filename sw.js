// ============================================================
// Service Worker بسيط — يخلي الموقع يتفتح كتطبيق (PWA) ويشتغل
// حتى مع ضعف الاتصال (يكاش شكل الصفحات، مش بيانات الشيت لأنها لازم تفضل لايف)
// ============================================================
const CACHE_NAME = 'nsh-report-cache-v1';
const APP_SHELL = [
    './index.html',
    './dashboard.html',
    './view.html',
    './report_result.html',
    './csv_upload.html',
    './analytics.html',
    './users.html',
    './css/style.css',
    './js/config.js',
    './js/api.js',
    './js/captcha.js',
    './js/whatsapp.js',
    './js/footer.js',
    './js/pwa.js',
    './img/logo.jpg',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .catch(() => {}) // لو أي ملف مش موجود، ما نوقفش التنصيب كله
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// استراتيجية: نروح للنت الأول (عشان بيانات الشيت تفضل حديثة)، ولو النت مقطوع نرجع للكاش
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    // ما نلمسش طلبات Google Apps Script نفسها، لازم تفضل لايف من غير كاش
    if (event.request.url.includes('script.google.com')) return;

    event.respondWith(
        fetch(event.request)
            .then(res => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
