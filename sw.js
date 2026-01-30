self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('v1').then(cache =>
      cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js'
      ])
    )
  );
});
// 攔截瀏覽器請求，優先從快取找檔案
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // 如果快取有，就用快取的；沒有才去網路抓
      return response || fetch(e.request);
    })
  );
});