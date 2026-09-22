const CACHE_NAME = 'timer-studio-v2';
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
// The ffmpeg-core files are fetched from a version-pinned CDN URL (@0.12.10) and never change,
// so they're safe to cache-first forever — that's what saves the ~30MB re-download on later exports.
const CDN_HOSTS = ['cdn.jsdelivr.net'];

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

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    if (CDN_HOSTS.includes(url.hostname)) {
        // Immutable, pinned-version CDN asset: cache-first is safe and avoids re-fetching ~30MB.
        event.respondWith(
            caches.match(req).then((cached) => cached || fetch(req).then((res) => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return res;
            }))
        );
        return;
    }

    // The app itself: network-first, so a new deploy is picked up immediately whenever the
    // phone/PC is online — cache-first here would silently freeze everyone on the version they
    // first loaded. Falls back to the cached copy only when offline (or the network fetch fails).
    event.respondWith(
        fetch(req).then((res) => {
            if (res && res.status === 200) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
        }).catch(() => caches.match(req))
    );
});
