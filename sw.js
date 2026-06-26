// Writer's Room — minimal service worker.
// Purpose: make the web app installable (standalone PWA) + a light offline shell.
// Kept intentionally simple so a new deploy is never blocked by a stale cached bundle:
// hashed JS/CSS assets always go to the network; only the HTML shell is cached as a
// fallback for offline navigations.
const SHELL_CACHE = "wr-shell-v1";
const SHELL_URL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle top-level navigations: network-first, fall back to the cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL_URL).then((r) => r || Response.error()))
    );
  }
  // Everything else (hashed assets, API calls, Supabase) goes straight to the network.
});
