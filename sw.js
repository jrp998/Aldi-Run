/* Aldi Run service worker — bump CACHE_VERSION whenever index.html changes */
const CACHE_VERSION = "aldirun-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Never intercept Firebase (live sync / auth need the network)
  if (url.hostname.includes("firebaseio.com") ||
      url.hostname.includes("firebasedatabase.app") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("gstatic.com") && url.pathname.includes("firebasejs") === false) {
    // fall through for non-firebasejs gstatic too — handled below
  }
  if (url.hostname.includes("firebaseio.com") || url.hostname.includes("firebasedatabase.app")) return;

  // Cache OCR + SDK libraries after first successful download (stale-while-revalidate)
  const isLib =
    url.hostname === "cdn.jsdelivr.net" ||        // tesseract.js + workers + wasm
    (url.hostname === "www.gstatic.com" && url.pathname.includes("firebasejs")) ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.includes("tessdata");            // OCR language data

  if (isLib) {
    e.respondWith(
      caches.open(CACHE_VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request).then((res) => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // App shell: network-first, cache fallback (so updates arrive, offline still works)
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE_VERSION).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request).then((h) => h || caches.match("./index.html")))
    );
  }
});
