const CACHE_NAME = 'ccm-billing-cache-v1';

// Static assets to cache immediately upon service worker installation
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

// Install event: Pre-cache basic assets and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event: Apply caching strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Bypass logic
  // Bypass development environment, hot-module reloading, and Webpack socket connections
  if (
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1' ||
    requestUrl.pathname.includes('webpack-hmr') ||
    requestUrl.pathname.includes('_next/webpack-hmr') ||
    requestUrl.pathname.includes('hot-update') ||
    requestUrl.pathname.startsWith('/_next/static/chunks/app/')
  ) {
    return;
  }

  // Bypass Clerk auth domains and Clerk requests
  if (
    requestUrl.hostname.includes('clerk') ||
    requestUrl.pathname.startsWith('/api/auth') ||
    event.request.headers.get('Authorization')
  ) {
    return;
  }

  // Bypass API requests to ensure real-time accuracy of transactions, settlements, and reports
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Cache-First Strategy for static assets (fonts, next/static files, local images)
  const isStaticAsset =
    requestUrl.pathname.startsWith('/_next/static/') ||
    requestUrl.pathname.startsWith('/fonts/') ||
    requestUrl.pathname.endsWith('.woff2') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.ico') ||
    requestUrl.pathname === '/manifest.json';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Check for valid response before caching
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network-First Strategy for document requests (navigation pages like /pos, /dashboard)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the latest page structure
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fall back to cache when offline or network fails
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If completely offline and not in cache, fallback to root or default layout
            return caches.match('/');
          });
        })
    );
  }
});
