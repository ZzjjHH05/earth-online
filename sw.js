// 地球OL PWA Service Worker
// 缓存策略：
//   - 页面/导航请求：network-first（先取网络，失败回退缓存）→ 部署新版本后自动更新
//   - 静态资源：cache-first（缓存优先，未命中走网络并写入缓存）→ 离线可用
// 版本升级：修改 CACHE_NAME（如 v2 → v3）即可让所有已安装用户强制换新缓存
const CACHE_NAME = 'earth-online-v2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 请求拦截
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 页面导航：先网络，失败回退缓存（保证部署后能拿到新版本）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(hit => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  // 其他资源：缓存优先，未命中走网络并缓存
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
