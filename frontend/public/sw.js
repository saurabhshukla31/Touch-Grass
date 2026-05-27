// Minimal service worker for RoamOut PWA.
// Pre-caches the app shell and serves cached assets when offline.
const CACHE = "touch-grass-v2";
const SHELL = [
    "/",
    "/index.html",
    "/manifest.json",
    "/favicon.svg",
    "/favicon.png",
    "/favicon.ico"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null)),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
            ),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    // Never intercept Mapbox / API calls.
    if (
        url.hostname.includes("mapbox.com") ||
        url.pathname.startsWith("/api/") ||
        url.pathname.includes("version.json")
    ) {
        return;
    }
    if (url.origin === location.origin) {
        e.respondWith(
            caches.match(req).then(
                (cached) =>
                    cached ||
                    fetch(req)
                        .then((res) => {
                            const clone = res.clone();
                            caches
                                .open(CACHE)
                                .then((c) => c.put(req, clone))
                                .catch(() => null);
                            return res;
                        })
                        .catch(() => cached),
            ),
        );
    }
});
