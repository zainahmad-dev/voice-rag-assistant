// Bump CACHE_VERSION whenever SHELL_ASSETS changes so the activate handler
// evicts the old cache instead of leaving stale entries behind forever.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Only stable, non-hashed URLs belong here. Hashed /_next/static/* build
// output is cached opportunistically at runtime instead (see fetch handler)
// since its filenames change on every build and can't be listed up front.
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/offline.html",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intercept GET requests — uploads, deletes, ingest, and query
  // calls must always reach the network untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live RAG/document/voice data depends on Supabase, Groq, and Vapi and can
  // never be meaningfully served from cache, so leave these alone entirely.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline ?? Response.error();
  }
}

// Safe for /_next/static/* because those filenames are content-hashed —
// a given URL's response never changes, so there's nothing to revalidate.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(async (response) => {
      await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await networkFetch) ?? Response.error();
}
