/* D'era House — Service Worker */
const CACHE_NAME = 'dera-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/products.html',
  '/about.html',
  '/locations.html',
  '/contact.html',
  '/gallery.html',
  '/custom-order.html',
  '/styles.css',
  '/animations.css',
  '/animations.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first for HTML, cache first for assets
  const isHTML = e.request.destination === 'document';
  e.respondWith(
    isHTML
      ? fetch(e.request).catch(() => caches.match(e.request))
      : caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
