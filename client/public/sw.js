const CACHE_NAME = 'fallonyou-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install: cache only true static assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache: API calls, Vite dev modules, HMR, source files, node_modules
  const skip =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.pathname === '/';

  if (skip) return;

  // Navigation requests: network-first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((r) => r || fetch(event.request))
      )
    );
    return;
  }

  // Only cache true static assets (icons, manifest, fonts)
  const isCacheable =
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot)$/) ||
    url.pathname === '/manifest.json';

  if (!isCacheable) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'FallonYou', body: 'Tienes una nueva notificación', icon: '/favicon.png' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FallonYou', {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
