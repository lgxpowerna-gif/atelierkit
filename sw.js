/* AtelierKit shell. Bump SW_VERSION to drop every previous cache.
   Network wins whenever it answers, so an open counter does not keep a stale copy. */
var SW_VERSION = "ak-v1";
var SHELL = [
  "/",
  "/index.html",
  "/js/holes.js",
  "/js/plain.js",
  "/js/offline.js",
  "/fittings.json",
  "/tarifs.html",
  "/merci.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil((async function () {
    var cache = await caches.open(SW_VERSION);
    await cache.addAll(SHELL);
    try {
      var listed = await fetch("/fittings.json");
      if (listed.ok) {
        var rows = await listed.clone().json();
        await cache.put("/fittings.json", listed);
        await Promise.all(rows.map(function (row) {
          if (!row || !row.img) return Promise.resolve();
          return cache.add(row.img).catch(function () {});
        }));
      }
    } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (key) { return key !== SW_VERSION; }).map(function (key) {
      return caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;
  event.respondWith((async function () {
    var cache = await caches.open(SW_VERSION);
    try {
      var fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      var cached = await cache.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        return (await cache.match("/index.html")) || (await cache.match("/")) || Promise.reject(err);
      }
      throw err;
    }
  })());
});
