/**
 * ORBIT Progressive Web App Service Worker
 * Safe caching strategy optimized for Vite SPA + Supabase + Vercel deployments.
 */

const CACHE_VERSION = 'orbit-pwa-v1.0.0';
const STATIC_CACHE = `orbit-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `orbit-runtime-${CACHE_VERSION}`;

// Pre-cached core assets for offline app shell
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

// Install: pre-cache shell and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[SW] Core asset precache partial failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up older cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Removing legacy cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event handler with safe caching rules
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Rule 1: Non-GET requests (mutations, login, uploads) must bypass service worker cache
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Rule 2: Supabase backend API calls (Auth, REST, Realtime, Functions) MUST NEVER be cached
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/')
  ) {
    return;
  }

  // Rule 3: Chrome extensions and non-HTTP schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Rule 4: Navigation requests (HTML SPA routes like /admin, /teacher, /student)
  // Network-First strategy: Always fetch newest index.html on deployment; fallback to cache if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, serve cached index.html
          return caches.match('/index.html').then((cached) => {
            return (
              cached ||
              new Response(
                '<!doctype html><html><head><meta charset="utf-8"><title>ORBIT Offline</title></head><body style="font-family:sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>ORBIT is currently offline</h2><p>Please check your internet connection.</p></div></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              )
            );
          });
        })
    );
    return;
  }

  // Rule 5: Static immutable Vite assets (/assets/*)
  // Cache-First with Network fallback (Vite hashes file names, so they are immutable)
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
      })
    );
    return;
  }

  // Rule 6: Web Fonts (Google Fonts, gstatic)
  // Stale-While-Revalidate strategy
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback for same-origin resources
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Client message listener (e.g. skip waiting trigger)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
