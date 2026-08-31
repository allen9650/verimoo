const CACHE_NAME = "verimoo-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/verimoo.png",
  "/icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/fonts/inter-regular.woff",
  "/fonts/inter-bold.woff",
];

// Install event: cache core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event: network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Ignore non-GET requests or browser extension URLs
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For dynamic API calls (except certificate previews), bypass or network-first
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For pages and static assets: Network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match("/")))
  );
});

