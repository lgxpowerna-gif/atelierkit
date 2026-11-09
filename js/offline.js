/* Offline access is for subscribers only.
   A trial or an expired trial never turns the cache on, and an offline
   visit without ak-pro stays locked even if a shell was cached earlier. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKOffline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var SW_VERSION = "ak-v1";
  var SW_URL = "/sw.js";

  function access(pro, onLine) {
    if (onLine === false && pro !== "oui") return "offline-locked";
    if (onLine === false && pro === "oui") return "offline-pro";
    return "online";
  }

  function shouldRegister(pro, onLine) {
    return pro === "oui" && onLine !== false;
  }

  function shouldClear(pro, onLine) {
    return pro !== "oui" && onLine !== false;
  }

  function sync(pro, onLine) {
    var nav = typeof navigator !== "undefined" ? navigator : null;
    if (!nav || !nav.serviceWorker) return Promise.resolve("unsupported");
    if (shouldRegister(pro, onLine)) {
      return nav.serviceWorker.register(SW_URL).then(function () { return "registered"; });
    }
    if (shouldClear(pro, onLine)) {
      var jobs = [
        nav.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        })
      ];
      if (typeof caches !== "undefined" && caches.keys) {
        jobs.push(caches.keys().then(function (keys) {
          return Promise.all(keys.filter(function (key) {
            return String(key).indexOf("ak-") === 0;
          }).map(function (key) { return caches.delete(key); }));
        }));
      }
      return Promise.all(jobs).then(function () { return "cleared"; });
    }
    return Promise.resolve("keep");
  }

  return {
    SW_VERSION: SW_VERSION,
    SW_URL: SW_URL,
    access: access,
    shouldRegister: shouldRegister,
    shouldClear: shouldClear,
    sync: sync
  };
});
