/* D'era House — Service Worker */
const CACHE_NAME = 'dera-static-v7';
const STATIC_ASSETS = [
  '/',
  '/products',
  '/about',
  '/locations',
  '/contact',
  '/gallery',
  '/custom-order',
  '/policies',
  '/styles.min.css?v=4',
  '/animations.min.css',
  '/animations.min.js',
  '/cart.js?v=5',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/404.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll() is all-or-nothing: a single 404 (a renamed asset, a typo)
      // aborts the whole install and leaves the site with no offline cache.
      // Cache each entry independently instead.
      .then(cache => Promise.all(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          fetch(request).then(response => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => caches.match(request));
      })
    );
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
