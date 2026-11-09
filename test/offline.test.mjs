import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const O = require("../js/offline.js");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const tarifs = fs.readFileSync(new URL("../tarifs.html", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8");

test("offline answers stay locked unless the subscription is valid", () => {
  assert.equal(O.access("oui", true), "online");
  assert.equal(O.access("oui", false), "offline-pro");
  assert.equal(O.access(null, true), "online");
  assert.equal(O.access("", false), "offline-locked");
  assert.equal(O.access(null, false), "offline-locked");
  assert.equal(O.access("non", false), "offline-locked");
  assert.equal(O.shouldRegister("oui", true), true);
  assert.equal(O.shouldRegister("oui", false), false);
  assert.equal(O.shouldRegister(null, true), false);
  assert.equal(O.shouldRegister("", true), false);
  assert.equal(O.shouldClear(null, true), true);
  assert.equal(O.shouldClear("oui", true), false);
  assert.equal(O.shouldClear(null, false), false);
});

test("the service worker is versioned and caches the shell, not the payment API", () => {
  assert.equal(O.SW_VERSION, "ak-v1");
  assert.match(sw, new RegExp("SW_VERSION = \"" + O.SW_VERSION + "\""));
  assert.match(sw, /\/fittings\.json/);
  assert.match(sw, /\/index\.html/);
  assert.match(sw, /\/js\/holes\.js/);
  assert.match(sw, /caches\.delete/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /\/api\//);
  assert.equal(sw.includes("buy.stripe.com"), false);
  const listed = JSON.parse(manifest);
  assert.equal(listed.start_url, "/");
  assert.equal(listed.icons.length >= 2, true);
  assert.equal(fs.existsSync(new URL("../icons/icon-192.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../icons/icon-512.png", import.meta.url)), true);
});

test("the page registers the worker only for subscribers and starts with one question", () => {
  assert.match(html, /AKOffline\.access/);
  assert.match(html, /AKOffline\.sync/);
  assert.match(html, /T'as quoi en main/);
  assert.match(html, /J'ai un raccord, c'est quoi/);
  assert.match(html, /Quel O-ring il me faut/);
  assert.match(html, /Quelle mèche pour ce taraud/);
  assert.match(html, /Quel trou de passage pour ma vis/);
  assert.match(html, /data-go="desk"/);
  assert.match(html, /data-go="tap"/);
  assert.match(html, /data-go="clear"/);
  assert.match(html, /data-go="oring"/);
  assert.match(html, /Quelle mèche je prends/);
  assert.match(html, /Quelle pièce je sors/);
  assert.match(html, /showTab\("start"\)/);
  assert.match(html, /offline-locked/);
  assert.equal(html.includes("premier mois"), false);
  assert.equal(html.includes("1 mois gratuit"), false);
  assert.match(tarifs, /30 jours/);
  assert.match(tarifs, /Mode hors ligne \(installable\)/);
  assert.equal(tarifs.includes("premier mois"), false);
  assert.match(tarifs, /9 \$/);
  assert.match(tarifs, /79 \$/);
});
