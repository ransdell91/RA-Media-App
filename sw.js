// R&A Media Productions: offline support for the R&A home and every app inside it.
// The app shell is cached so each app opens without a connection.
// Data is never cached here; each app keeps its own copy of what it last loaded.
// Other apps on ransdell91.github.io (Farm R&A) share cache storage, so only ra-* caches are ever cleared.
const VERSION = 'ra-1.08';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './vendor/supabase-2.45.4.js',
  './icons/icon-192-v2.png', './icons/icon-512-v2.png', './icons/icon-maskable-512-v2.png', './icons/favicon-32.png', './icons/apple-touch-icon.png', './icons/badge-96.png', './icons/logo-on-dark.svg', './icons/logo-on-light.svg', './icons/icon.svg',
  './otm/', './otm/index.html', './otm/icons/icon-192.png', './otm/icons/favicon-32.png', './otm/icons/apple-touch-icon.png',
  './sbm/', './sbm/index.html', './sbm/icons/icon-192.png', './sbm/icons/favicon-32.png', './sbm/icons/apple-touch-icon.png', './sbm/icons/icon.svg',
  './farm/', './farm/index.html', './farm/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ra-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch Supabase traffic (data, sign-in, live updates).
  if (url.hostname.endsWith('supabase.co')) return;

  // Pages: network first so updates arrive, cached copy when offline.
  if (req.mode === 'navigate') {
    const key = new URL(url.pathname, url.origin).href;
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); } return res; })
        .catch(() => caches.match(key).then((hit) => hit || caches.match(url.pathname.endsWith('/') ? key + 'index.html' : key)).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Fonts: serve from cache, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(VERSION).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  // Everything else on this site: cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});

// Reminder notifications sent by the server (Supabase function otm-push).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'R&A', body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'R&A';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: d.icon || './otm/icons/icon-192.png',
    badge: './icons/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || './' }
  }));
});

// Tapping a notification opens the app (or brings it forward) on the right screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        try { await c.navigate(target); } catch (e) { c.postMessage({ type: 'open', url: target }); }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

// If the browser replaces this phone's push registration, tell any open app window to save the new one.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const opts = event.oldSubscription && event.oldSubscription.options;
      if (opts && opts.applicationServerKey) await self.registration.pushManager.subscribe(opts);
    } catch (e) {}
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    all.forEach((c) => c.postMessage({ type: 'subchange' }));
  })());
});
