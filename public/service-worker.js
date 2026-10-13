const CACHE_NAME = 'filehive-v1';
const STATIC_CACHE = 'filehive-static-v1';
const API_CACHE = 'filehive-api-v1';

// Static assets to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - NetworkFirst (always try fresh data, fall back to cache)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets - CacheFirst (serve from cache, update in background)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
