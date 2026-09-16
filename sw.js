import { APP_VERSION } from './js/version.js';
const CACHE_NAME = 'slovenska-knjizevnost-v' + APP_VERSION;
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/app.css',
    './css/variables.css',
    './css/base.css',
    './css/main-components.css',
    './css/settings-modal.css',
    './js/main.js',
    './js/modules/router.js',
    './js/modules/data.js',
    './js/modules/AuthorManager.js',
    './js/modules/GlobalSearch.js',
    './js/modules/settings.js',
    './js/modules/Favorites.js',
    './js/modules/utils.js',
    './js/modules/TTSManager.js',
    './js/modules/ShareManager.js',
    './js/modules/SEOManager.js',
    './js/modules/HistoryManager.js',
    './js/modules/StorageManager.js',
    './js/modules/Renderer.js',
    './js/modules/GestureManager.js',
    './js/workers/SearchWorker.js',
    './js/modules/BookmarkManager.js',
    './js/modules/Highlighter.js',
    './js/modules/LastRead.js',
    './js/modules/GlobalEvents.js',
    './js/version.js',
    './img/authors/Dragotin_Kette.webp',
    './img/authors/Ivan-Cankar-1.webp',
    './img/branding/favicon-0.svg',
    './img/authors/preseren-goldenstein.webp',
    './img/authors/simon-gregorcic.webp',
    // Fonts
    './css/google-fonts-local.css',
    './css/fonts/cinzel-var-ext.woff2',
    './css/fonts/cinzel-var.woff2',
    './css/fonts/robotomono-var-ext.woff2',
    './css/fonts/robotomono-var.woff2',
    './css/fonts/robotomono-var-italic-ext.woff2',
    './css/fonts/robotomono-var-italic.woff2',
    './css/fonts/ebgaramond-6.woff2',
    './css/fonts/ebgaramond-7.woff2',
    './css/fonts/inter-13.woff2',
    './css/fonts/inter-14.woff2',
    './css/fonts/lora-27.woff2',
    './css/fonts/lora-28.woff2',
    './css/fonts/opensans-37.woff2',
    './css/fonts/opensans-38.woff2',
    './css/fonts/playfairdisplay-45.woff2',
    './css/fonts/playfairdisplay-46.woff2',
    './css/fonts/playfairdisplay-41.woff2',
    './css/fonts/playfairdisplay-42.woff2'
];

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await cache.addAll(STATIC_ASSETS);
            console.log('[SW] Base app shell cached.');
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. JSON Data: Stale-While-Revalidate (Fresh content background update)
    if (url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // 2. Core Shell (JS, CSS, HTML): Stale-While-Revalidate
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => null);
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // 3. Fonts & Images: Cache-First
    if (url.pathname.includes('/fonts/') || url.pathname.includes('/img/')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request).then(networkResponse => {
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    });
                })
        );
        return;
    }

    // Default: Cache-First
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
