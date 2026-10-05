const CACHE_NAME = 'bk-portal-v6';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'data/portal-data.json',
  'manifest.json',
  'images/logo.png',
  'images/band-hero.jpg',
  'images/pia.png',
  'images/adri.png',
  'images/kar.png',
  'images/maff.png',
  'images/dani.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
