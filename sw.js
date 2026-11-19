// 血壓記錄 — Service Worker：App 本體快取，離線也能開啟
// 更新 App 後請把 VERSION 加 1，使用者下次開啟就會換新版。
const VERSION = 'bp-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // 同步 API 是 POST，直接走網路
  const url = new URL(req.url);

  // 本站檔案：先用快取（立即開啟），背景更新
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
        return hit || net;
      })
    );
    return;
  }

  // Excel 解析器（cdnjs）：第一次連線時存起來，之後離線也能匯入 xlsx
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
