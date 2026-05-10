const CACHE = 'hvac-v1';
const SHELL = [
  '/',
  '/static/css/main.css',
  '/static/js/api.js',
  '/static/js/app.js',
  '/static/js/modules/agenda.js',
  '/static/js/modules/clients.js',
  '/static/js/modules/articles.js',
  '/static/js/modules/devis.js',
  '/static/js/modules/facturation.js',
  '/static/icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API : réseau uniquement (pas de cache)
  if (url.pathname.startsWith('/api/')) return;

  // Assets statiques : cache d'abord, réseau en fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || fresh;
    })
  );
});
