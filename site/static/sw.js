const CACHE = 'simsimdae-v1';
const STATIC = ['/assets/main.css', '/assets/leaderboard.js', '/assets/share.js', '/assets/ads.js', '/manifest.json', '/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 게임 JS/CSS: cache-first (1년 캐시)
  if (url.pathname.startsWith('/games/') || url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    })));
    return;
  }
  // HTML: network-first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
