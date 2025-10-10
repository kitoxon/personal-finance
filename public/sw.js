const CACHE_NAME = 'finance-tracker-v1';
const urlsToCache = [
  '/',
  '/expenses',
  '/income',
  '/debts',
  '/overflow',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const req = event.request;

  // 1) Never handle non-GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 2) Only handle http/https, skip chrome-extension, chrome, file, ws/wss, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 3) Optional: skip analytics or other external CDNs you don't want to cache
  // if (/google-analytics|some-cdn/.test(url.host)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 4) Try cache first
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);

      // 5) Only cache good responses
      // - res.ok: status 200–299
      // - res.type === 'basic': same-origin
      // If you *do* want to cache cross-origin, you can also allow 'opaque',
      // but it has limitations. Keeping it strict avoids weirdness.
      if (res.ok && res.type === 'basic') {
        // Only cache http(s) GETs we approved above
        await cache.put(req, res.clone());
      }

      return res;
    } catch (err) {
      // 6) Offline fallback only for navigations
      if (req.mode === 'navigate') {
        // Prefer a real offline page if you have one
        return (await cache.match('/offline.html')) ||
               (await cache.match('/')) ||
               new Response('Offline', { status: 503, statusText: 'Offline' });
      }
      // Let it error for non-navigation fetches
      throw err;
    }
  })());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'finance-notification',
    requireInteraction: false,
  };
  
  event.waitUntil(
    self.registration.showNotification('Finance Tracker', options)
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});