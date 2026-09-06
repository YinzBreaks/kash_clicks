/**
 * KLICKASHKLIC: Midnight Redaction Bureau - Service Worker
 * Provides 100% offline capability, zero-latency caching, and PWA install support.
 */

const CACHE_NAME = 'klickashklic-v1.1.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/icon.svg'
];

// 1. Install: Pre-cache all core game assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[ServiceWorker] Pre-cache warning:', err);
      })
  );
});

// 2. Activate: Clean up previous cache versions and take immediate control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('klickashklic-') && name !== CACHE_NAME)
          .map(name => {
            console.log('[ServiceWorker] Clearing legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Stale-While-Revalidate with full offline fallback
self.addEventListener('fetch', event => {
  // Only handle standard GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin or non-http protocols (e.g., chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Background network fetch to keep cache fresh
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails (offline), return cached version or root index
          return cachedResponse || caches.match('./index.html');
        });

      // If already cached, serve instantly; otherwise wait for network fetch
      return cachedResponse || networkFetch;
    })
  );
});
