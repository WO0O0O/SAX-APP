// Sax Tutor service worker (the online copy only; the Mac version never registers it).
// On install it downloads every file of the build, so the app then works with no connection, sheet music included.
// The build step replaces the BUILD marker below with a fingerprint of the files, so each deploy gets a fresh cache.
const CACHE = 'sax-__BUILD__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      let urls = ['/', '/index.html'];
      try {
        urls = urls.concat(await (await fetch('/precache.json', { cache: 'no-store' })).json());
      } catch {
        // offline at install time: whatever is visited later is cached as it is used
      }
      await Promise.allSettled(urls.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('sax-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  // Pages: the network if it answers (so a new deploy shows up), otherwise the saved copy.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()),
    );
    return;
  }

  // Everything else: the saved copy first (files are fingerprinted), and keep what is fetched.
  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })(),
  );
});
