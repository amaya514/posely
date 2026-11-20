// Posely offline support.
const CACHE = 'posely-v8';
const SHELL = ['./', './index.html', './app.js', './guides.js', './cutout.js', './match.js', './filters.js', './makeup.js', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'];
const BIG = /\.(glb|fbx|task|wasm)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Big model files never change: cache first.
  if (BIG.test(url.pathname)) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r)))); return; }
  // App files: network first so updates arrive, cached copy when offline.
  if (url.origin === location.origin) { e.respondWith(fetch(req).then(r => put(req, r)).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))); return; }
  // Fonts etc.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
});
