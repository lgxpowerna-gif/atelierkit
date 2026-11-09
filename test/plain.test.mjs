import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const P = require("../js/plain.js");
const H = require("../js/holes.js");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const LETTERS = { A: 0.234, B: 0.238, C: 0.242, D: 0.246, E: 0.25, F: 0.257, G: 0.261, H: 0.266, I: 0.272, J: 0.277, K: 0.281, L: 0.29, M: 0.295, N: 0.302, O: 0.316, P: 0.323, Q: 0.332, R: 0.339, S: 0.348, T: 0.358, U: 0.368, V: 0.377, W: 0.386, X: 0.397, Y: 0.404, Z: 0.413 };
const NUMBERS = { 3: 0.213, 7: 0.201, 4: 0.209 };

test("tap answer says what to do, with units, and coarse differs from fine", () => {
  const coarseIn = H.tapDrillDiameter(0.25, 1 / 20, 75);
  const fineIn = H.tapDrillDiameter(0.25, 1 / 28, 75);
  const coarseBit = P.nearestBit(coarseIn, LETTERS, NUMBERS);
  const fineBit = P.nearestBit(fineIn, LETTERS, NUMBERS);
  assert.equal(coarseBit, "#7");
  assert.equal(fineBit, "#3");
  const coarse = P.describeTap({ lang: "fr", family: "UNC", name: "1/4-20", shop: coarseBit, inches: coarseIn });
  const fine = P.describeTap({ lang: "fr", family: "UNF", name: "1/4-28", shop: fineBit, inches: fineIn });
  assert.match(coarse.action, /Prends la mèche #7/);
  assert.match(coarse.action, /Taraude 1\/4-20/);
  assert.match(coarse.action, /po/);
  assert.match(coarse.action, /mm/);
  assert.match(fine.action, /#3/);
  assert.match(fine.action, /1\/4-28/);
  assert.notEqual(coarse.action, fine.action);
  assert.doesNotMatch(coarse.action, /9\/32/);
  const en = P.describeTap({ lang: "en", family: "UNC", name: "1/4-20", shop: "#7", inches: coarseIn });
  assert.match(en.action, /Drill with a #7/);
  assert.match(en.action, /then tap 1\/4-20/);
  assert.match(en.action, /in/);
  assert.match(en.action, /mm/);
});

test("metric tap drills stay pitch-specific in the sentence", () => {
  const coarse = H.tapDrillDiameter(10, 1.5, 75);
  const fine = H.tapDrillDiameter(10, 1.25, 75);
  const c = P.describeTap({ lang: "fr", family: "MET", name: "M10×1.5", shop: (Math.round(coarse * 10) / 10).toFixed(1) + " mm", inches: coarse / 25.4 });
  const f = P.describeTap({ lang: "fr", family: "MET", name: "M10×1.25", shop: (Math.round(fine * 10) / 10).toFixed(1) + " mm", inches: fine / 25.4 });
  assert.match(c.action, /8\.5 mm/);
  assert.match(c.action, /M10×1\.5/);
  assert.match(c.action, /po/);
  assert.match(f.action, /8\.8 mm/);
  assert.match(f.action, /M10×1\.25/);
  assert.notEqual(c.action, f.action);
});

test("clearance answer uses the table drill and tells you not to tap", () => {
  const hit = H.lookupClearance("IN", "1/4", P.DEFAULT_FIT);
  const job = P.describeClearance(hit, "fr");
  assert.equal(P.DEFAULT_FIT, "normal");
  assert.match(job.action, /Prends la mèche 9\/32 po/);
  assert.match(job.action, /mm/);
  assert.match(job.action, /vis 1\/4 po passe/);
  assert.match(job.action, /Taraude pas/);
  assert.match(job.action, /Choix habituel/);
  assert.doesNotMatch(job.action, /#7/);
  assert.equal(P.describeClearance.toString().includes("tapDrill"), false);
  assert.equal(P.describeClearance.toString().includes("1.299"), false);
  const loose = P.describeClearance(H.lookupClearance("IN", "1/4", "large"), "fr");
  assert.match(loose.action, /19\/64 po/);
  assert.match(loose.action, /Jeu large/);
  assert.doesNotMatch(loose.action, /Choix habituel/);
  const metric = P.describeClearance(H.lookupClearance("MM", "M10", "normal"), "fr");
  assert.match(metric.action, /11 mm/);
  assert.match(metric.action, /po/);
  assert.match(metric.action, /M10/);
  assert.doesNotMatch(metric.action, /8\.5/);
  const en = P.describeClearance(hit, "en");
  assert.match(en.action, /Pull a 9\/32 in/);
  assert.match(en.action, /Do not tap/);
  assert.match(en.action, /Normal fit/);
  assert.equal(P.describeClearance(null, "fr"), null);
});

test("pipe tap is not offered as a clearance hole", () => {
  const job = P.describeTap({ lang: "fr", family: "NPT", name: "1/4-18", shop: "7/16", inches: 0.4375 });
  assert.match(job.action, /7\/16/);
  assert.match(job.action, /1\/4-18 NPT/);
  assert.match(job.action, /po/);
  assert.match(job.action, /mm/);
  assert.match(job.action, /Pas de trou de passage/);
  assert.doesNotMatch(job.action, /boulon .* traverse/);
  const en = P.describeTap({ lang: "en", family: "BSPP", name: "G1/4-19", shop: "29/64", inches: 0.453 });
  assert.match(en.action, /No clearance hole/);
  assert.match(en.action, /BSP/);
});

test("a far drawer bit is not described as the size you typed", () => {
  const far = P.describeDrill({ lang: "fr", name: "Z", inches: 1, bitInches: 0.413 });
  assert.match(far.action, /Tu as demandé 1\.000 po/);
  assert.match(far.action, /Z \(0\.413 po/);
  assert.doesNotMatch(far.action, /Mèche Z : 1\.000 po/);
  const close = P.describeDrill({ lang: "fr", name: "5/32", inches: 5 / 32, bitInches: 5 / 32 });
  assert.match(close.action, /Mèche 5\/32/);
  assert.match(close.action, /Tarauds/);
  const en = P.describeDrill({ lang: "en", name: "Z", inches: 1, bitInches: 0.413 });
  assert.match(en.action, /You asked for/);
  assert.match(en.action, /Taps/);
});

test("a bad read never invents a drill", () => {
  for (const kind of ["bad-measure", "drill", "drill-thread", "oring", "fitting", "clear-missing"]) {
    const fr = P.emptyHint(kind, "fr");
    const en = P.emptyHint(kind, "en");
    assert.equal(fr.length > 20, true);
    assert.notEqual(fr, en);
    assert.doesNotMatch(fr, /#7|9\/32|8\.5 mm/);
    assert.doesNotMatch(en, /#7|9\/32|8\.5 mm/);
  }
  assert.equal(P.looksLikeThread("1/4-20"), true);
  assert.equal(P.looksLikeThread("M10x1.5"), true);
  assert.equal(P.looksLikeThread("3/8 NPT"), true);
  assert.equal(P.looksLikeThread("0.250 po"), false);
  assert.equal(P.looksLikeThread("5/32"), false);
  assert.equal(P.looksLikeThread("1-1/2"), false);
  assert.match(P.emptyHint("drill-thread", "fr"), /Tarauds/);
  assert.match(P.emptyHint("fitting", "fr"), /2404/);
  assert.match(P.emptyHint("oring", "fr"), /214/);
});

test("normal fit is the recommended default in both languages", () => {
  assert.match(P.fitAdvice("normal", "fr"), /choix habituel/);
  assert.match(P.fitAdvice("normal", "en"), /usual choice/);
  assert.match(P.fitAdvice("loose", "fr"), /large/);
  const words = P.lexicon("fr").map((item) => item.word);
  for (const word of ["Taraud", "Passage", "Pas", "NPT", "BSP", "Section (CS)", "Jeu serré", "Jeu normal", "Jeu large"]) {
    assert.equal(words.includes(word), true, word);
  }
  const normal = P.lexicon("fr").find((item) => item.word === "Jeu normal");
  assert.match(normal.plain, /Laisse Normal/);
  assert.equal(P.lexicon("en").length, P.lexicon("fr").length);
  assert.match(P.lexicon("en").find((item) => item.word === "Normal fit").plain, /Leave Normal/);
});

test("shop words find the catalogue, and the page keeps the paywall", () => {
  assert.deepEqual(P.searchWords("bouchon").includes("plug"), true);
  assert.deepEqual(P.searchWords("bride").includes("flange"), true);
  assert.deepEqual(P.searchWords("JIC"), ["jic"]);
  assert.match(html, /js\/plain\.js/);
  assert.match(html, /Comment ça marche/);
  assert.match(html, /À quoi ça sert/);
  assert.match(html, /placeholder="0\.250 po"/);
  assert.match(html, /placeholder="0\.562 po"/);
  assert.match(html, /1\/4-20/);
  assert.match(html, /M10x1\.5/);
  assert.match(html, /3\/8 NPT/);
  assert.match(html, /ak-guide/);
  assert.match(html, /Essai de 30 jours fini/);
  assert.match(html, /Réservé aux abonnés/);
  assert.match(html, /S\\'abonner/);
  assert.match(html, /Voir les abonnements/);
  assert.equal(html.includes("mois fini"), false);
  assert.match(html, /1\/4-20 prend #7, 1\/4-28 prend #3/);
  assert.match(html, /change avec le pas/);
});
