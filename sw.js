const CACHE_NAME = 'timer-studio-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './vendor/ffmpeg/index.js',
    './vendor/ffmpeg/classes.js',
    './vendor/ffmpeg/const.js',
    './vendor/ffmpeg/errors.js',
    './vendor/ffmpeg/utils.js',
    './vendor/ffmpeg/worker.js',
    './vendor/ffmpeg/types.js',
    './vendor/util/index.js',
    './vendor/util/const.js',
    './vendor/util/errors.js',
    './vendor/util/types.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Cache-first, falling back to network. Successful responses (including the cross-origin
// ffmpeg-core.js/.wasm fetched from jsdelivr at export time) are cached as they come in, so a
// later offline export can reuse them instead of re-downloading ~30MB.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return res;
            }).catch(() => cached);
        })
    );
});
