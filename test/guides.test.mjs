import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const H = require("../js/holes.js");
const P = require("../js/plain.js");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const letters = JSON.parse(index.match(/const LETTERS=(\{.*?\});/)[1]);
const numbers = JSON.parse(index.match(/const NUMBERS=(\{.*?\});/)[1]);

const SITE = "https://atelierkit.faitle.net";
const guidesRoot = path.join(root, "guides");
const slugs = fs.readdirSync(guidesRoot).filter((name) => {
  return fs.existsSync(path.join(guidesRoot, name, "index.html"));
});
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");

function read(slug) {
  return fs.readFileSync(path.join(guidesRoot, slug, "index.html"), "utf8");
}
function tag(html, re) {
  const m = html.match(re);
  assert.ok(m, re.toString());
  return m[1];
}
function shopMm(major, pitch) {
  return (Math.round(H.tapDrillDiameter(major, pitch, 75) * 10) / 10).toFixed(1);
}

test("sitemap lists every guide and robots allows them", () => {
  assert.ok(slugs.length >= 18 && slugs.length <= 24, "page count " + slugs.length);
  assert.match(robots, /Allow:\s*\//);
  assert.match(robots, /Sitemap:\s*https:\/\/atelierkit\.faitle\.net\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/atelierkit\.faitle\.net\/guides<\/loc>/);
  for (const slug of slugs) {
    assert.match(sitemap, new RegExp("<loc>" + SITE + "/guides/" + slug + "</loc>"));
  }
  assert.match(index, /href="\/guides"/);
});

test("each guide has a unique title, description, canonical and h1", () => {
  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();
  const h1s = new Set();
  const indexHtml = fs.readFileSync(path.join(guidesRoot, "index.html"), "utf8");
  assert.equal((indexHtml.match(/<h1>/g) || []).length, 1);
  for (const slug of slugs) {
    const html = read(slug);
    const title = tag(html, /<title>([^<]+)<\/title>/);
    const description = tag(html, /<meta name="description" content="([^"]+)">/);
    const canonical = tag(html, /<link rel="canonical" href="([^"]+)">/);
    const h1 = tag(html, /<h1>([^<]+)<\/h1>/);
    const og = tag(html, /<meta property="og:url" content="([^"]+)">/);
    assert.equal((html.match(/<h1>/g) || []).length, 1, slug);
    assert.equal(canonical, SITE + "/guides/" + slug, slug);
    assert.equal(og, canonical, slug);
    assert.match(html, /Essai de 30 jours/, slug);
    assert.match(html, /application\/ld\+json/, slug);
    JSON.parse(tag(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    assert.equal(titles.has(title), false, title);
    assert.equal(descriptions.has(description), false, description);
    assert.equal(canonicals.has(canonical), false, canonical);
    assert.equal(h1s.has(h1), false, h1);
    titles.add(title);
    descriptions.add(description);
    canonicals.add(canonical);
    h1s.add(h1);
    assert.equal(html.includes("ak-pro"), false, slug);
    assert.equal(/\+1|\(\d{3}\)/.test(html), false, slug);
  }
});

test("tap drill answers match the 75% formula", () => {
  const m8 = read("meche-taraud-m8");
  assert.equal(shopMm(8, 1.25), "6.8");
  assert.equal(shopMm(8, 1), "7.0");
  assert.match(m8, /6\.8 mm/);
  assert.match(m8, /7\.0 mm/);
  assert.match(m8, /quelle mèche pour taraud M8/i);
  assert.match(m8, /9 mm/);

  const m10 = read("percage-taraudage-m10");
  assert.equal(shopMm(10, 1.5), "8.5");
  assert.equal(shopMm(10, 1.25), "8.8");
  assert.match(m10, /8\.5 mm/);
  assert.match(m10, /8\.8 mm/);
  assert.match(m10, /diamètre perçage taraudage M10/i);

  const quarter = H.tapDrillDiameter(0.25, 1 / 20, 75);
  const bit = P.nearestBit(quarter, letters, numbers);
  assert.equal(bit, "#7");
  const page = read("meche-taraud-1-4-20");
  assert.match(page, /#7/);
  assert.match(page, /0\.201 po/);
  assert.match(page, /1\/4-20/);
  assert.match(page, /mèche pour taraud 1\/4-20/i);

  const chart = read("tableau-meche-taraud-metrique");
  for (const [name, major, pitch] of [["M3×0.5", 3, 0.5], ["M6×1", 6, 1], ["M12×1.75", 12, 1.75], ["M24×3", 24, 3]]) {
    assert.match(chart, new RegExp(name.replace("×", "×") + "[\\s\\S]{0,40}" + shopMm(major, pitch) + " mm"));
  }
  assert.match(chart, /tableau mèche taraud métrique/i);
});

test("clearance answers are the ISO drills, not the tap drills", () => {
  const m8 = H.lookupClearance("MM", "M8", "normal");
  assert.equal(m8.drill, "9 mm");
  const page = read("trou-passage-vis-m8");
  assert.match(page.answer || page, /9 mm/);
  assert.match(page, /6\.8 mm/);
  assert.match(page, /Taraude pas/);
  assert.match(page, /trou de passage \(clearance\) pour vis M8/i);
  const chart = read("trou-degagement");
  assert.match(chart, /11 mm/);
  assert.match(chart, /9\/32/);
  assert.match(chart, /diamètre trou de dégagement/i);
  assert.match(chart, /clearance hole chart métrique/i);
  assert.equal(H.lookupClearance("IN", "1/4", "normal").drill, "9/32");
});

test("NPT shop drills and O-ring example stay the published ones", () => {
  const npt = read("meche-taraud-npt");
  assert.match(npt, /7\/16/);
  assert.match(npt, /1\/4-18 NPT|1\/4 NPT/);
  assert.match(npt, /Pas de trou de passage/);
  assert.match(npt, /taraud NPT quelle mèche/i);
  const ring = read("mesurer-joint-torique");
  assert.match(ring, /0\.984/);
  assert.match(ring, /0\.139/);
  assert.match(ring, /1\.262/);
  assert.match(ring, /comment mesurer un joint torique/i);
  assert.match(ring, /dimension d'un joint torique/i);
  assert.match(read("tableau-as568"), /214/);
  assert.match(read("o-ring-size-chart"), /O-ring size chart en français/i);
  const id214 = 0.984 + 2 * 0.139;
  assert.equal(id214.toFixed(3), "1.262");
});
