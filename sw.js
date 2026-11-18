// Offline helper for the Morning Briefing app. It only keeps a copy of the app itself so it opens
// without a connection; the inbox and episodes always come live from the Apps Script web app.
const CACHE = 'briefing-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './cover-small.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('briefing-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never touch the Apps Script data calls, the episode audio, or anything else off this site.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network first so updates show up right away; fall back to the saved copy offline.
  // A share from another app opens "./?text=..." — serve the app shell for it when offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && !url.search) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(event.request, copy)); }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./')))
  );
});
