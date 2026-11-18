// Minimal service worker: makes the web build installable and gives an offline app shell.
// It deliberately leaves audio, the Subsonic API and everything cross-origin to the browser.
const CACHE = 'ditty-shell-v1';
const SCOPE_PATH = new URL(self.registration.scope).pathname; // e.g. "/ditty/"
const SHELL_URL = SCOPE_PATH + 'index.html';
const ASSET_PREFIX = SCOPE_PATH + '_expo/static/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;
  if (request.destination === 'audio' || request.destination === 'video') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;
  if (url.pathname.includes('/rest/')) return; // Subsonic API when proxied same-origin (stream, download, getCoverArt)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
  } else if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    // no-cache: always revalidate with the server, never answer from the HTTP cache.
    const response = await fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request.url, copy));
    }
    return response;
  } catch (error) {
    // Offline: the last page fetched for this URL, else the app shell. Never preferred over the network.
    const cache = await caches.open(CACHE);
    return (await cache.match(request.url)) || (await cache.match(SHELL_URL)) || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
