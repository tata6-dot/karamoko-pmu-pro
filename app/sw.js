/* ============================================
   KARAMOKO PMU PRO - Service Worker
   Mode hors ligne (PWA)
   ============================================ */

const CACHE_NAME = 'karamoko-pmu-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './js/app.js',
  './js/core/engine.js',
  './js/core/combinator.js',
  './js/core/validator.js',
  './js/parsers/pdf-parser.js',
  './js/parsers/manual-entry.js',
  './js/storage/db.js',
  './js/storage/exporter.js',
  './js/storage/backup.js',
  './js/ui/renderer.js',
  './js/ui/charts.js',
  './js/ui/modals.js',
  './data/hippodromes.json',
  './manifest.json'
];

// ---------- INSTALLATION ----------
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => console.error('[SW] Erreur cache:', err))
  );
});

// ---------- ACTIVATION ----------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Suppression ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ---------- FETCH (Cache-First) ----------
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;
            
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            return new Response('Hors ligne', { status: 503 });
          });
      })
  );
});