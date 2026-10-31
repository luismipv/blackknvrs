const CACHE_NAME = 'bk-portal-v25';
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
    }).then(() => self.clients.claim())
  );
});

// Network-First Strategy:
// ALWAYS fetch fresh code & data from the server when online.
// Fall back to cache ONLY when completely offline.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  // Let Firebase / Firestore requests bypass SW directly
  if (url.includes('firestore.googleapis.com') || url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
