import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const H = require("../js/holes.js");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const tarifs = fs.readFileSync(new URL("../tarifs.html", import.meta.url), "utf8");
const verify = fs.readFileSync(new URL("../api/verify.js", import.meta.url), "utf8");
const merci = fs.readFileSync(new URL("../merci.html", import.meta.url), "utf8");

test("metric clearance is the ISO drill, not the nominal and not the tap drill", () => {
  const m10 = H.lookupClearance("MM", "M10", "normal");
  const m10fine = H.lookupClearance("MET", "M10×1.25", "close");
  const m6 = H.lookupClearance("MM", "M6", "medium");
  const m8 = H.lookupClearance("MM", "M8x1", "normal");
  const m12 = H.lookupClearance("MM", "M12", "coarse");
  assert.equal(m10.drill, "11 mm");
  assert.equal(m10.min, 11);
  assert.notEqual(m10.min, 10);
  assert.equal(m10fine.min, 10.5);
  assert.equal(m10fine.key, "M10");
  assert.equal(m6.min, 6.6);
  assert.equal(H.lookupClearance("MM", "M6", "close").min, 6.4);
  assert.equal(H.lookupClearance("MM", "M6", "loose").min, 7);
  assert.equal(m8.min, 9);
  assert.equal(m8.key, "M8");
  assert.equal(m12.min, 14.5);
  const tapM10 = H.tapDrillDiameter(10, 1.5, 75);
  const tapM6 = H.tapDrillDiameter(6, 1, 75);
  assert.ok(Math.abs(tapM10 - 8.538582) < 1e-4);
  assert.ok(Math.abs(tapM6 - 5.025721) < 1e-4);
  assert.notEqual(m10.min, Math.round(tapM10 * 10) / 10);
  assert.ok(m10.min > tapM10);
});

test("inch clearance is the ASME drill, shared by UNC and UNF", () => {
  const quarter = H.lookupClearance("UNC", "1/4-20", "normal");
  const quarterFine = H.lookupClearance("UNF", "1/4-28", "normal");
  assert.equal(quarter.drill, "9/32");
  assert.equal(quarter.min, 0.281);
  assert.equal(quarter.max, 0.290);
  assert.equal(quarter.nominal, 0.25);
  assert.notEqual(quarter.min, quarter.nominal);
  assert.deepEqual(
    { drill: quarter.drill, min: quarter.min, max: quarter.max },
    { drill: quarterFine.drill, min: quarterFine.min, max: quarterFine.max }
  );
  assert.equal(H.lookupClearance("IN", "1/4", "close").drill, "17/64");
  assert.equal(H.lookupClearance("IN", "1/4", "loose").drill, "19/64");
  assert.notEqual(H.lookupClearance("IN", "1/4", "loose").drill, "5/16");
  assert.equal(H.lookupClearance("UNC", "3/8-16", "normal").drill, "13/32");
  assert.equal(H.lookupClearance("UNF", "3/8-24", "normal").drill, "13/32");
  assert.equal(H.lookupClearance("IN", "#10-24", "normal").drill, "#2");
  assert.equal(H.lookupClearance("IN", "#10-32", "close").drill, "#5");
  assert.equal(H.lookupClearance("IN", "#10", "loose").drill, "B");
  const tap = H.tapDrillDiameter(0.25, 1 / 20, 75);
  assert.ok(Math.abs(tap - 0.201286071) < 1e-6);
  assert.ok(tap < 0.21);
  assert.ok(quarter.min > tap + 0.05);
});

test("coarse and fine tap drills differ; clearance does not", () => {
  const unc = H.tapDrillDiameter(0.25, 1 / 20, 75);
  const unf = H.tapDrillDiameter(0.25, 1 / 28, 75);
  assert.ok(Math.abs(unc - 0.201286071) < 1e-6);
  assert.ok(Math.abs(unf - 0.215204336) < 1e-6);
  assert.ok(unf - unc > 0.01);
  assert.equal(H.lookupClearance("UNC", "1/4-20", "normal").drill, H.lookupClearance("UNF", "1/4-28", "normal").drill);
  const m10c = H.tapDrillDiameter(10, 1.5, 75);
  const m10f = H.tapDrillDiameter(10, 1.25, 75);
  const m8c = H.tapDrillDiameter(8, 1.25, 75);
  const m8f = H.tapDrillDiameter(8, 1, 75);
  assert.equal(Math.round(m10c * 10) / 10, 8.5);
  assert.equal(Math.round(m10f * 10) / 10, 8.8);
  assert.equal(Math.round(m8c * 10) / 10, 6.8);
  assert.equal(Math.round(m8f * 10) / 10, 7);
  assert.notEqual(Math.round(m10c * 10) / 10, Math.round(m10f * 10) / 10);
  assert.notEqual(Math.round(m8c * 10) / 10, Math.round(m8f * 10) / 10);
  assert.equal(H.lookupClearance("MM", "M10×1.5", "normal").min, 11);
  assert.equal(H.lookupClearance("MM", "M10×1.25", "normal").min, 11);
  assert.equal(H.lookupClearance("MM", "M8×1.25", "normal").min, H.lookupClearance("MM", "M8×1", "normal").min);
});

test("entitlement states stay on the 30-day rule", () => {
  const now = 1_700_000_000_000;
  assert.equal(H.TRIAL_MS, 30 * 86400000);
  assert.equal(H.entitlement("", 0, now), "empty");
  assert.equal(H.entitlement(null, now - 2 * 86400000, now), "active");
  assert.equal(H.entitlement(null, now - 29 * 86400000, now), "active");
  assert.equal(H.entitlement(null, now - 30 * 86400000, now), "expired");
  assert.equal(H.entitlement(null, now - 40 * 86400000, now), "expired");
  assert.equal(H.entitlement("oui", now - 40 * 86400000, now), "pro");
});

test("pipe threads and unpublished sizes are not clearance cases", () => {
  for (const family of ["NPT", "BSP", "BSPP", "BSPT", "NPSM"]) {
    assert.equal(H.lookupClearance(family, "1/4-20", "normal"), null);
    assert.equal(H.isPipeFamily(family), true);
  }
  for (const key of ["1/8-27", "1/4-18", "3/8-18", "1/2-14", "3/4-14", "1-11.5", "G1/4-19", "G1/2-14", "2-11.5"]) {
    assert.equal(H.lookupClearance("IN", key, "normal"), null);
    assert.equal(H.lookupClearance("UNC", key, "loose"), null);
  }
  assert.equal(H.lookupClearance("UNC", "1/2-13", "normal").drill, "9/16");
  assert.equal(H.lookupClearance("IN", "9/16-12", "normal"), null);
  assert.equal(H.lookupClearance("IN", "#12-24", "normal"), null);
  assert.equal(H.lookupClearance("IN", "2-4.5", "normal"), null);
  assert.equal(H.lookupClearance("MM", "M39", "normal"), null);
  assert.ok(H.CLEAR_IN.every((row) => !String(row.key).includes("NPT")));
  assert.ok(H.CLEAR_MM.every((row) => !String(row.key).includes("BSP")));
});

test("every published row is larger than nominal and ordered by fit", () => {
  for (const row of H.CLEAR_IN.concat(H.CLEAR_MM)) {
    assert.ok(row.close.min > row.nominal, row.key);
    assert.ok(row.normal.min > row.close.min, row.key);
    assert.ok(row.loose.min > row.normal.min, row.key);
    assert.notEqual(row.normal.drill, String(row.nominal));
  }
});

test("clearance lookup source does not call the tap formula", () => {
  const src = H.lookupClearance.toString();
  assert.equal(src.includes("1.299"), false);
  assert.equal(src.includes("tapDrill"), false);
  assert.match(H.SOURCES.metric, /ISO 273:1979/);
  assert.match(H.SOURCES.inch, /ASME B18\.2\.8-1999/);
});

test("page separates the two jobs and keeps the paywall", () => {
  assert.equal(html.includes("Pour un trou avant taraud, prends la plus petite"), false);
  assert.equal(html.includes("Pour un trou qui laisse passer, prends la plus grosse"), false);
  assert.match(html, /Mèche de passage/);
  assert.match(html, /Mèche avant taraud/);
  assert.match(html, /data-tab="clear"/);
  assert.match(html, /id="clear"/);
  assert.match(html, /\["desk","convert","clear","tap","oring","fit"\]/);
  assert.match(html, /clearbig/);
  assert.match(html, /tapbig/);
  assert.match(html, /AKHoles\.TRIAL_MS/);
  assert.match(html, /AKHoles\.entitlement/);
  assert.match(html, /change avec le pas/);
  assert.match(html, /1\/4-20 prend #7, 1\/4-28 prend #3/);
  assert.match(html, /ak-pro/);
  assert.match(html, /mois fini/);
  assert.match(html, /taille demandée/);
  assert.match(html, /id="feet"/);
  assert.match(html, /tokens\.every/);
  assert.match(html, /épaisseur CS/);
  assert.match(tarifs, /https:\/\/buy\.stripe\.com\/4gMcN4bmegVmg3e5MfcfK0h\?locale=fr/);
  assert.match(tarifs, /https:\/\/buy\.stripe\.com\/fZu4gy4XQ6gIg3e4IbcfK0i\?locale=fr/);
  assert.match(tarifs, /9 \$/);
  assert.match(tarifs, /79 \$/);
  assert.match(verify, /metadata\.app !== "atelierkit"/);
  assert.match(verify, /STRIPE_SECRET_KEY \|\| process\.env\.STRIPE_atelierpro_SECRET_KEY/);
  assert.match(merci, /ak-pro/);
  assert.match(merci, /\/api\/verify\?session_id=/);
});
