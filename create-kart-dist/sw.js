/*
 * Aurelle service worker.
 *
 * What it does:
 *  - Precaches the application shell (the page, its scripts, styles and icons).
 *  - Pages: tries the network first (so updates are never stale), and falls back to the
 *    cached shell, then to offline.html, when the network is slow or unavailable.
 *  - Shell files: served from the cache first.
 *  - Everything else (other sites, API calls, images, future product data): ignored,
 *    so the browser handles it normally and nothing sensitive is ever cached.
 *
 * The two placeholders below are filled in by scripts/build-sw.mjs after `vite build`.
 * The BUILD_ID changes whenever any shell file changes, which makes the browser install the
 * new worker, and old caches are deleted when it activates.
 */
const BUILD_ID = "57de0705a5ff";
const PRECACHE_URLS = [
  "assets/index-C7PK5hq5.css",
  "assets/index-CiAm10EA.js",
  "favicon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "./",
  "manifest.webmanifest",
  "offline.html"
];

const CACHE_PREFIX = "aurelle-shell-";
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const SCOPE = self.registration.scope; // always ends with "/"
const SHELL_URL = SCOPE;
const OFFLINE_URL = new URL("offline.html", SCOPE).href;
const NAVIGATION_TIMEOUT_MS = 4000;

const PRECACHE_SET = new Set(PRECACHE_URLS.map((path) => new URL(path, SCOPE).href));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // cache: "reload" skips the browser's HTTP cache so a fresh copy is stored.
        // cache.add rejects on any non-2xx response, so a broken deploy fails to install
        // instead of silently caching an error page.
        Promise.all([...PRECACHE_SET].map((url) => cache.add(new Request(url, { cache: "reload" })))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (PRECACHE_SET.has(url.origin + url.pathname)) {
    event.respondWith(handleShellFile(request));
  }
});

function networkWithTimeout(request) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Navigation timed out")), NAVIGATION_TIMEOUT_MS);
    }),
  ]);
}

async function handleNavigation(request) {
  try {
    return await networkWithTimeout(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(SHELL_URL)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function handleShellFile(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  return cached || fetch(request);
}
