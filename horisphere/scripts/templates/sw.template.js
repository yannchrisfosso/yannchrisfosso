/* Service worker Horisphère — généré par scripts/prepare-assets.mjs (ne pas modifier public/sw.js à la main). */
const VERSION = "__VERSION__";
const PAGES = `hs-pages-${VERSION}`;
const STATIC = "hs-static-v1"; // fichiers versionnés par leur nom (/_next/static) : conservés entre versions
const ASSETS = `hs-assets-${VERSION}`;
const CORE_ROUTES = ["/", "/comparer", "/favoris", "/mon-univers", "/deux-mondes", "/deux-mondes/vue", "/installer", "/aide", "/hors-ligne"];
const CORE_ASSETS = ["/manifest.webmanifest", "/geo/countries-50m.json", "/icons/icon.svg", "/icons/icon-192.png", "__WORKER__"];

async function precache() {
  const pages = await caches.open(PAGES);
  const stat = await caches.open(STATIC);
  const assets = await caches.open(ASSETS);
  await Promise.all(
    CORE_ASSETS.map((u) => assets.add(new Request(u, { cache: "reload" })).catch(() => {})),
  );
  for (const route of CORE_ROUTES) {
    try {
      const res = await fetch(new Request(route, { cache: "reload" }));
      if (!res.ok) continue;
      await pages.put(route, res.clone());
      // Ressources de la page (scripts, styles, polices) pour qu'elle fonctionne hors ligne
      const html = await res.text();
      const urls = new Set();
      for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) urls.add(m[1]);
      await Promise.all([...urls].map((u) => stat.match(u).then((hit) => hit || stat.add(u)).catch(() => {})));
    } catch (e) {
      /* hors ligne pendant l'installation : on réessaiera à la prochaine visite */
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, STATIC, ASSETS]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(request), timeout(4000)]);
    if (res && res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = (await cache.match(request, { ignoreSearch: request.mode === "navigate" })) || (await caches.match(request));
    if (hit) return hit;
    if (fallbackUrl) {
      const fb = await caches.match(fallbackUrl);
      if (fb) return fb;
    }
    return Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has("verification-horloge")) return; // test d'horloge : toujours le réseau

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES, "/hors-ligne"));
    return;
  }
  // Charges utiles RSC des navigations côté client
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, PAGES));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (/^\/(flags|geo|icons|vendor)\//.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, ASSETS));
  }
});
