// ============================================================
// إعدادات الاتصال بـ Google Sheets عبر Apps Script
// ⚠️ تحذير: هذا الملف يظهر بالكامل لأي زائر للموقع (لأنه HTML/JS ثابت).
// أي حد يقدر يشوف الرابط والمفتاح من كود الصفحة ويستخدمهم مباشرة.
// ============================================================
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbwWbwbyoBLWa_3NaOjtSMhT_sDHdh-34SY0oMko9zZmZ50-9DABV2ZXWyJXab0dfXMM/exec';
const DEFAULT_API_KEY = 'Demo2026SecretKeyXyz';

const API_URL = (typeof localStorage !== 'undefined' && localStorage.getItem('nsh_override_api_url')) || DEFAULT_API_URL;
const API_KEY = (typeof localStorage !== 'undefined' && localStorage.getItem('nsh_override_api_key')) || DEFAULT_API_KEY;
