// @ts-check
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
// @ts-expect-error - self is ServiceWorkerGlobalScope in SW context
const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

const CACHE_NAME = 'bitvolt-static-v1';
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif|json)$/i;

/** @param {Request} request */
function isNavigationRequest(request) {
  return request.mode === 'navigate' && request.method === 'GET';
}

/** @param {string} url */
function isStaticAsset(url) {
  return STATIC_EXTENSIONS.test(new URL(url).pathname);
}

/** @param {ExtendableEvent} event */
sw.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/', '/app'])));
  sw.skipWaiting();
});

/** @param {ExtendableEvent} event */
sw.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
  );
  sw.clients.claim();
});

/** @param {FetchEvent} event */
sw.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  // Cache-first for static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          return (
            fallback || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          );
        })
    );
    return;
  }
});

/** @param {ExtendableMessageEvent} event */
sw.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
