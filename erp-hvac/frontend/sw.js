const CACHE = 'erp-dubai-v1';
const STATIC = [
  '/index.html',
  '/app.html',
  '/manifest.json',
  '/css/base.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/app.js',
  '/js/modules/clients.js',
  '/js/modules/articles.js',
  '/js/modules/dashboard.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC.filter(Boolean))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ne pas intercepter les appels API
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
