/* Writes static guide pages, the guides index, and sitemap.xml.
   Numbers come from the same tap-drill formula and clearance tables as the app. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const H = require(path.join(root, "js/holes.js"));
const P = require(path.join(root, "js/plain.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const LETTERS = JSON.parse(html.match(/const LETTERS=(\{.*?\});/)[1]);
const NUMBERS = JSON.parse(html.match(/const NUMBERS=(\{.*?\});/)[1]);

const SITE = "https://atelierkit.faitle.net";
const NPT = [
  ["1/8-27", "Q", "0.332"],
  ["1/4-18", "7/16", "0.438"],
  ["3/8-18", "9/16", "0.563"],
  ["1/2-14", "45/64", "0.703"],
  ["3/4-14", "29/32", "0.906"]
];
const MET = [
  ["M3×0.5", 3, 0.5], ["M4×0.7", 4, 0.7], ["M5×0.8", 5, 0.8], ["M6×1", 6, 1],
  ["M8×1.25", 8, 1.25], ["M8×1", 8, 1], ["M10×1.5", 10, 1.5], ["M10×1.25", 10, 1.25],
  ["M12×1.75", 12, 1.75], ["M12×1.25", 12, 1.25], ["M14×2", 14, 2], ["M16×2", 16, 2],
  ["M20×2.5", 20, 2.5], ["M24×3", 24, 3]
];
const UNC = [
  ["#8-32", 0.164, 32], ["#10-24", 0.19, 24], ["1/4-20", 0.25, 20], ["1/4-28", 0.25, 28],
  ["5/16-18", 0.3125, 18], ["3/8-16", 0.375, 16], ["1/2-13", 0.5, 13]
];
const AS568 = [
  ["010", 0.239, 0.07], ["014", 0.489, 0.07], ["112", 0.487, 0.103],
  ["210", 0.734, 0.139], ["214", 0.984, 0.139], ["222", 1.484, 0.139]
];

function shopMm(major, pitch) {
  return (Math.round(H.tapDrillDiameter(major, pitch, 75) * 10) / 10).toFixed(1);
}
function tapIn(major, tpi) {
  const d = H.tapDrillDiameter(major, 1 / tpi, 75);
  return { d, shop: P.nearestBit(d, LETTERS, NUMBERS).replace(/"$/, ""), mm: (d * 25.4).toFixed(2), po: d.toFixed(3) };
}
function clear(key) {
  const fam = String(key).startsWith("M") ? "MM" : "IN";
  return {
    close: H.lookupClearance(fam, key, "close"),
    normal: H.lookupClearance(fam, key, "normal"),
    loose: H.lookupClearance(fam, key, "loose")
  };
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function mmPo(inches) { return (inches * 25.4).toFixed(2); }

const tapInch = Object.fromEntries(UNC.map((r) => [r[0], tapIn(r[1], r[2])]));
const tapMet = Object.fromEntries(MET.map((r) => [r[0], shopMm(r[1], r[2])]));

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function cta(hash, label) {
  return `<p class="cta"><a class="btn" href="/#${hash}">${esc(label)}</a><span class="trial">Essai de 30 jours, gratuit. Après, 9 $ par mois. Le reste de la charte est dans l'outil.</span></p>`;
}
function faqBlock(faq) {
  if (!faq || !faq.length) return "";
  return `<section class="faq"><h2>Questions rapides</h2>${faq.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join("")}</section>`;
}
function related(pages, slugs) {
  return `<nav class="related"><h2>Guides proches</h2><ul>${slugs.map((slug) => `<li><a href="/guides/${slug}">${esc(pages.find((p) => p.slug === slug).h1)}</a></li>`).join("")}</ul></nav>`;
}
function jsonLd(page) {
  const graph = [{
    "@type": "Article",
    headline: page.h1,
    description: page.description,
    inLanguage: "fr-CA",
    mainEntityOfPage: page.url
  }];
  if (page.faq) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a }
      }))
    });
  }
  if (page.howto) {
    graph.push({
      "@type": "HowTo",
      name: page.howto.name,
      step: page.howto.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text }))
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}
function layout(page, pages) {
  const body = page.body + cta(page.hash, page.cta) + faqBlock(page.faq) + related(pages, page.related);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${page.url}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${page.url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="fr_CA">
<meta property="og:image" content="${SITE}/icons/icon-512.png">
<link rel="stylesheet" href="/guides/guide.css">
<script type="application/ld+json">${jsonLd(page)}</script>
</head>
<body>
<header>
  <a href="/">AK AtelierKit</a>
  <nav>
    <a href="/guides">Guides</a>
    <a href="/#${page.hash}">Outil</a>
    <a href="/tarifs">Essai 30 jours</a>
  </nav>
</header>
<main>
<h1>${esc(page.h1)}</h1>
${body}
</main>
<footer>AtelierKit · <a href="/guides">Guides</a> · <a href="/">L'outil</a> · <a href="/tarifs">Essai de 30 jours, puis 9 $/mois</a></footer>
</body>
</html>
`;
}

const q14 = tapInch["1/4-20"];
const q1428 = tapInch["1/4-28"];
const m8 = clear("M8");
const m6 = clear("M6");
const m10 = clear("M10");
const m12 = clear("M12");
const qInch = clear("1/4");
const q38 = clear("3/8");
const q12 = clear("1/2");

const pages = [];
function add(page) { pages.push(page); }

add({
  slug: "meche-taraud-m8",
  h1: "Quelle mèche pour taraud M8 ? Réponse claire",
  title: "Quelle mèche pour taraud M8 ? Réponse claire | AtelierKit",
  description: "Mèche pour taraud M8×1.25 : 6.8 mm à 75 %. Le M8×1 fin prend 7.0 mm. Ce n'est pas le trou de passage (9 mm).",
  hash: "taraud",
  cta: "Ouvre les tarauds — essai de 30 jours",
  related: ["percage-taraudage-m10", "tableau-meche-taraud-metrique", "trou-passage-vis-m8"],
  faq: [
    { q: "Quelle mèche pour un taraud M8×1.25 ?", a: "6.8 mm, à 75 % de filet. C'est le pas gros." },
    { q: "Et le M8 fin ?", a: "M8×1 prend 7.0 mm. Le pas change la mèche." }
  ],
  body: `<p class="answer"><span>Réponse</span>Prends une mèche de 6.8 mm, puis taraude M8×1.25. Le fin (M8×1) : 7.0 mm.</p>
<p class="lead">Tu cherches quelle mèche pour taraud M8. À 75 % de filet, le gros M8×1.25 (M8x1.25) perce à <strong>6.8 mm</strong>. Le fin M8×1 perce à <strong>7.0 mm</strong>. Mélange pas les deux.</p>
<p>Le trou de passage (clearance), c'est autre chose : une vis M8 qui traverse sans filet, jeu normal, c'est <strong>9 mm</strong>. Si tu perces 9 mm puis tu taraude, le filet tient pas.</p>
${table(["Taraud", "Pas", "Mèche à 75 %"], [["M8×1.25", "gros", "6.8 mm"], ["M8×1", "fin", "7.0 mm"], ["M6×1", "gros", tapMet["M6×1"] + " mm"], ["M10×1.5", "gros", tapMet["M10×1.5"] + " mm"]])}
<p class="note">Chiffres du même calcul que l'outil, 75 % de filet. Laisse 75 si on t'a rien dit d'autre.</p>`
});

add({
  slug: "meche-taraud-1-4-20",
  h1: "Mèche pour taraud 1/4-20 — chart + calcul",
  title: "Mèche pour taraud 1/4-20 — chart + calcul | AtelierKit",
  description: "Mèche pour taraud 1/4-20 : #7, calcul 0.201 po (5.11 mm) à 75 %. Le 1/4-28 fin prend #3.",
  hash: "taraud",
  cta: "Calcule un autre taraud — essai de 30 jours",
  related: ["meche-taraud-npt", "percage-avant-taraudage", "calculatrice-taraudage"],
  faq: [
    { q: "Quelle mèche pour un 1/4-20 ?", a: "La mèche #7, soit 0.201 po (5.11 mm), à 75 %." },
    { q: "C'est la même pour un 1/4-28 ?", a: "Non. Le 1/4-28 fin prend la mèche #3 (0.215 po)." }
  ],
  body: `<p class="answer"><span>Réponse</span>Prends la mèche #7 (0.201 po · ${q14.mm} mm), puis taraude 1/4-20.</p>
<p class="lead">La mèche pour taraud 1/4-20, à 75 % de filet, calcule à <strong>0.201 po</strong> (${q14.mm} mm). Au tiroir, c'est la <strong>#7</strong> (0.201 po). Le 1/4, c'est la grosseur de la vis. Le 20, c'est les filets par pouce.</p>
<p>Le filet fin 1/4-28, c'est pas la même mèche : calcul ${q1428.po} po, mèche <strong>#3</strong>. Le trou de passage d'une vis 1/4 po, jeu normal, c'est 9/32 po. Taraude pas un trou de 9/32.</p>
${table(["Taraud", "Calcul 75 %", "Mèche du tiroir"], UNC.slice(0, 5).map((r) => {
    const t = tapInch[r[0]];
    return [r[0], t.po + " po", t.shop];
  }))}
<p class="note">Chart partielle. UNC et UNF au complet, avec le pourcentage, c'est dans l'outil.</p>`
});

add({
  slug: "percage-taraudage-m10",
  h1: "Diamètre de perçage avant taraudage M10",
  title: "Diamètre de perçage avant taraudage M10 | AtelierKit",
  description: "Diamètre de perçage avant taraudage M10×1.5 : 8.5 mm. Le M10×1.25 fin : 8.8 mm. Passage normal : 11 mm.",
  hash: "taraud",
  cta: "Perçage des autres métriques — essai de 30 jours",
  related: ["meche-taraud-m8", "tableau-meche-taraud-metrique", "trou-passage-vis-m8"],
  faq: [
    { q: "Quel diamètre percer avant de tarauder un M10 ?", a: "8.5 mm pour le pas gros M10×1.5, à 75 %." },
    { q: "Pourquoi pas 10 mm ?", a: "10 mm, c'est la vis, pas le trou. Le trou de passage normal, c'est 11 mm, et on ne taraude pas ça." }
  ],
  body: `<p class="answer"><span>Réponse</span>Perce 8.5 mm, puis taraude M10×1.5. Le fin M10×1.25 : 8.8 mm.</p>
<p class="lead">Le diamètre perçage taraudage M10 dépend du pas. Gros M10×1.5 : <strong>8.5 mm</strong>. Fin M10×1.25 : <strong>8.8 mm</strong>. Les deux à 75 % de filet.</p>
<p>Perce pas 10 mm : c'est le diamètre de la vis. Pour laisser passer une vis M10 sans filet, le trou normal (ISO 273, série moyenne) c'est <strong>11 mm</strong>.</p>
${table(["Taraud", "Mèche à 75 %"], [["M8×1.25", tapMet["M8×1.25"] + " mm"], ["M10×1.5", "8.5 mm"], ["M10×1.25", "8.8 mm"], ["M12×1.75", tapMet["M12×1.75"] + " mm"]])}`
});

add({
  slug: "tableau-meche-taraud-metrique",
  h1: "Tableau mèches taraud métrique (M3 à M24)",
  title: "Tableau mèches taraud métrique (M3 à M24) | AtelierKit",
  description: "Tableau mèche taraud métrique à 75 % : M3 2.5 mm, M6 5.0 mm, M8×1.25 6.8 mm, M10×1.5 8.5 mm, jusqu'à M24.",
  hash: "taraud",
  cta: "Change le pourcentage dans l'outil — essai de 30 jours",
  related: ["meche-taraud-m8", "percage-taraudage-m10", "calculatrice-taraudage"],
  faq: [
    { q: "C'est quoi le 75 % ?", a: "Le trou habituel avant de tarauder. Plus gros, le filet est faible. Plus petit, le taraud casse." },
    { q: "Le gros et le fin, c'est la même mèche ?", a: "Non. M8×1.25 c'est 6.8 mm, M8×1 c'est 7.0 mm. M10×1.5 c'est 8.5 mm, M10×1.25 c'est 8.8 mm." }
  ],
  body: `<p class="answer"><span>Réponse</span>M8×1.25 → 6.8 mm. M10×1.5 → 8.5 mm. M6×1 → ${tapMet["M6×1"]} mm. Tout ça à 75 %.</p>
<p class="lead">Voici le tableau mèche taraud métrique de M3 à M24, au pas gros et au pas fin quand les deux existent. C'est le perçage avant taraudage, pas le trou de passage.</p>
${table(["Taraud", "Mèche 75 %"], MET.map((r) => [r[0], tapMet[r[0]] + " mm"]))}
<p class="note">Tableau à 75 %. Pour un autre pourcentage, ou la mèche en pouces, ouvre l'outil.</p>`
});

add({
  slug: "identifier-raccord-hydraulique",
  h1: "Identifier un raccord hydraulique (JIC, NPT, BSP)",
  title: "Identifier un raccord hydraulique (JIC, NPT, BSP) | AtelierKit",
  description: "Outil pour identifier les fittings hydrauliques : regarde le bout. Pointu = JIC 37°, plat avec O-ring = ORFS, cône = NPT, droit avec joint = BSPP.",
  hash: "fitting",
  cta: "Identifie ton fitting — essai de 30 jours",
  related: ["difference-jic-npt", "bsp-ou-npt", "identifier-filetage-hydraulique", "types-raccords-hydrauliques"],
  faq: [
    { q: "Par où je commence ?", a: "Par le bout. Pointu sans caoutchouc : JIC. Plat avec un O-ring dans la face : ORFS. En cône : NPT. Filet droit et joint sur la face : BSPP." },
    { q: "Un 1/2 po, c'est quel fitting ?", a: "Souvent le boyau 1/2, dash -8, filet JIC 3/4-16. Le 1/2 NPT est plus gros, environ 0.84 po dehors." }
  ],
  body: `<p class="answer"><span>Réponse</span>Regarde le bout. Pointu = JIC. Plat avec un O-ring = ORFS. Cône = NPT. Droit + joint sur la face = BSPP.</p>
<p class="lead">Pour identifier un raccord hydraulique, t'as pas besoin du numéro Parker. Cet outil pour identifier les fittings hydrauliques part de ce que t'as dans la main : mâle ou femelle, mesure sur le filet, puis le bout.</p>
<ul>
<li><strong>JIC 37°</strong> : nez pointu, comme un chapeau. Pas de caoutchouc sur le nez.</li>
<li><strong>ORFS</strong> : face plate, O-ring dans la face. Ça visse pas sur un JIC.</li>
<li><strong>NPT</strong> : filet de pipe en cône. Plus tu visses, plus ça serre.</li>
<li><strong>BSPP</strong> : filet souvent droit, joint (washer) sur la face. C'est pas un NPT.</li>
<li><strong>ORB / SAE</strong> : filet droit, O-ring à la base, pas sur le nez.</li>
</ul>
<p>Mâle : tu mesures dehors, sur le filet. Femelle : dedans. Exemple déjà dans l'outil : 0.562 po, souvent un mâle JIC -6, filet 9/16-18. Le même filet existe en ORFS -4. Le bout tranche.</p>`
});

add({
  slug: "difference-jic-npt",
  h1: "JIC vs NPT : comment les distinguer au comptoir",
  title: "JIC vs NPT : comment les distinguer au comptoir | AtelierKit",
  description: "Différence JIC et NPT : JIC est droit, siège 37°, nez pointu. NPT est un filet de pipe en cône. Un 1/2 po n'est pas le même des deux côtés.",
  hash: "fitting",
  cta: "Compare sur ta pièce — essai de 30 jours",
  related: ["identifier-raccord-hydraulique", "bsp-ou-npt", "reconnaitre-jic-37"],
  faq: [
    { q: "Je peux visser un JIC dans un NPT ?", a: "Non. Le siège et le filet ne sont pas les mêmes. Ça fuit ou ça force." },
    { q: "Le nom 1/2 veut dire quoi ?", a: "En JIC, 1/2 po c'est souvent le boyau (dash -8, filet 3/4-16). En NPT, 1/2 c'est le pipe, environ 0.84 po dehors." }
  ],
  body: `<p class="answer"><span>Réponse</span>JIC : nez pointu, filet droit, siège 37°. NPT : filet en cône, ça serre en vissant. C'est pas le même raccord.</p>
<p class="lead">La différence JIC et NPT se voit au comptoir, sans catalogue. JIC vs NPT : un a un nez, l'autre a un cône.</p>
<ul>
<li><strong>JIC</strong> : le bout est pointu. Le filet est droit (UNF). L'étanchéité se fait sur le siège à 37°, pas dans les filets.</li>
<li><strong>NPT</strong> : le filet est en cône. Plus tu visses, plus ça serre. Le nom (1/4, 1/2) c'est pas le diamètre dehors.</li>
</ul>
${table(["On te dit", "JIC", "NPT"], [["1/4 po", "Boyau -4, filet 7/16-20", "Pipe 1/4-18, dehors ~0.54 po"], ["1/2 po", "Boyau -8, filet 3/4-16", "Pipe 1/2-14, dehors ~0.84 po"], ["Le bout", "Pointu, 37°", "Cône"]])}`
});

add({
  slug: "bsp-ou-npt",
  h1: "BSP ou NPT ? 3 indices pour ne pas se tromper",
  title: "BSP ou NPT ? 3 indices pour ne pas se tromper | AtelierKit",
  description: "Raccord BSP ou NPT : compte les filets, regarde si c'est droit ou en cône, et où ça scelle. Un NPT ne scelle pas dans un BSPP.",
  hash: "fitting",
  cta: "Mesure ton filet — essai de 30 jours",
  related: ["difference-jic-npt", "identifier-filetage-hydraulique", "identifier-raccord-hydraulique"],
  faq: [
    { q: "Un BSPP visse dans un NPT ?", a: "Ça peut engager un peu, puis ça force. L'angle des filets n'est pas le même (55° contre 60°) et l'étanchéité non plus." },
    { q: "C'est quoi les 3 indices ?", a: "Le pas (filets par pouce), le cône ou le droit, et l'endroit du joint : dans les filets (NPT) ou sur la face (BSPP)." }
  ],
  body: `<p class="answer"><span>Réponse</span>3 indices : le pas, le cône, le joint. NPT est en cône et scelle dans les filets. BSPP est souvent droit et scelle sur la face.</p>
<p class="lead">Raccord BSP ou NPT, comment savoir sans te planter au comptoir. Les deux ont l'air de pipe. C'est pas interchangeable.</p>
<ol>
<li><strong>Compte les filets.</strong> Un 1/4 NPT fait 18 filets au pouce. Un G1/4 BSPP en fait 19. Un 1/8 NPT fait 27, un G1/8 fait 28.</li>
<li><strong>Droit ou cône.</strong> NPT et BSPT sont en cône. BSPP (filet G) est droit : tu peux le tourner sans que ça coince de plus en plus.</li>
<li><strong>Où ça scelle.</strong> NPT : dans les filets (téflon ou pâte). BSPP : un joint plat ou un bonded seal sur la face.</li>
</ol>
<p>Si t'as un doute, mesure dehors sur le filet et ouvre l'outil. Invente pas le filet.</p>`
});

add({
  slug: "identifier-filetage-hydraulique",
  h1: "Identifier un filetage hydraulique sans calibre cher",
  title: "Identifier un filetage hydraulique sans calibre cher | AtelierKit",
  description: "Identifier un filetage hydraulique : mâle ou femelle, mesure sur le filet, compte les filets sur un pouce. Exemple 0.562 po et 18 filets → souvent 9/16-18.",
  hash: "fitting",
  cta: "Entre ta mesure — essai de 30 jours",
  related: ["identifier-raccord-hydraulique", "bsp-ou-npt", "difference-jic-npt"],
  howto: {
    name: "Identifier un filetage hydraulique",
    steps: [
      "Dis si c'est mâle (filet dehors) ou femelle (filet dedans).",
      "Mesure sur le filet, pas dans le fond. Exemple : 0.562 po.",
      "Compte les filets sur un pouce si tu peux. 18 ou 20, c'est pas la même pièce.",
      "Regarde le bout pour départager JIC, ORFS, NPT et BSPP."
    ]
  },
  faq: [
    { q: "J'ai pas de calibre à filets.", a: "Un vernier et tes yeux suffisent pour le gros du comptoir. Mesure dehors (mâle) ou dedans (femelle), puis le bout." },
    { q: "Je compte pas les filets ?", a: "Laisse le champ vide. L'outil donne les proches. S'il y en a plusieurs, c'est le bout qui tranche." }
  ],
  body: `<p class="answer"><span>Réponse</span>Mâle ou femelle, mesure sur le filet, compte les filets si tu peux, puis regarde le bout.</p>
<p class="lead">Pour identifier un filetage hydraulique sans calibre cher : un vernier fait la job. Mesure pas dans le fond du filet.</p>
<ol>
<li>Mâle : filet dehors. Femelle : filet dedans.</li>
<li>Vernier sur les premiers filets. Exemple déjà dans l'outil : <strong>0.562 po</strong>.</li>
<li>Filets sur 1 po. 18 et 20, c'est pas la même pièce. Si tu sais pas, laisse vide.</li>
<li>Le bout : pointu JIC, plat ORFS, cône NPT, joint de face BSPP.</li>
</ol>
<p>0.562 po et 18 filets, c'est souvent un 9/16-18 : mâle JIC -6 ou ORFS -4. Le bout dit lequel.</p>`
});

add({
  slug: "mesurer-joint-torique",
  h1: "Comment mesurer un joint torique (ID, section, AS568)",
  title: "Comment mesurer un joint torique et trouver sa dimension | AtelierKit",
  description: "Dimension d'un joint torique : mesure la section (CS) puis le trou (ID). Exemple dash 214 : ID 0.984 po, CS 0.139 po, OD 1.262 po.",
  hash: "oring",
  cta: "Trouve le dash — essai de 30 jours",
  related: ["tableau-as568", "joints-toriques-metriques", "o-ring-size-chart"],
  howto: {
    name: "Mesurer un joint torique",
    steps: [
      "Mesure l'épaisseur du rond (section, CS) en premier.",
      "Mesure le trou du milieu (ID).",
      "Le dehors (OD) = ID + 2 × CS. Ça sert à checker.",
      "Cherche le dash AS568 le plus proche. 214 est courant sur un boyau."
    ]
  },
  faq: [
    { q: "Je mesure quoi en premier ?", a: "L'épaisseur du rond, la section (CS). Sur un boyau, c'est souvent 1/8 po (0.139 po)." },
    { q: "Le dash, c'est la grosseur du boyau ?", a: "Non. Le dash 214, c'est un O-ring : ID 0.984 po, section 0.139 po. C'est pas un boyau de 1/4." }
  ],
  body: `<p class="answer"><span>Réponse</span>Section d'abord, puis le trou. Dash 214 : ID 0.984 po, CS 0.139 po, OD 1.262 po.</p>
<p class="lead">Comment mesurer un joint torique : la dimension d'un joint torique, c'est trois chiffres. La section (CS), le trou (ID), le dehors (OD). OD = ID + 2 × CS.</p>
<p>Exemple AS568 déjà dans l'outil, le dash <strong>214</strong> : trou <strong>0.984 po</strong> (${mmPo(0.984)} mm), épaisseur <strong>0.139 po</strong> (${mmPo(0.139)} mm), dehors <strong>1.262 po</strong>. Sur un boyau, commence par 1/8 po.</p>
${table(["Dash", "ID po", "CS po", "OD po"], AS568.slice(3, 6).map((o) => [o[0], o[1].toFixed(3), o[2].toFixed(3), (o[1] + 2 * o[2]).toFixed(3)]))}`
});

add({
  slug: "tableau-as568",
  h1: "Tableau AS568 — tailles de joints toriques",
  title: "Tableau AS568 — tailles de joints toriques | AtelierKit",
  description: "Taille joint torique AS568 : extraits dash 010, 112, 210, 214. Le 214 mesure ID 0.984 po et section 0.139 po. La charte complète est dans l'outil.",
  hash: "oring",
  cta: "Charte AS568 complète — essai de 30 jours",
  related: ["mesurer-joint-torique", "o-ring-size-chart", "joints-toriques-metriques"],
  faq: [
    { q: "C'est toute la charte ?", a: "Non. Quelques dash courants. Les séries 0xx, 1xx, 2xx et le reste sont dans l'outil." },
    { q: "Quelle section sur un boyau ?", a: "Souvent 0.139 po, la série 2xx. Le dash 214 est un exemple courant." }
  ],
  body: `<p class="answer"><span>Réponse</span>Dash 214 : ID 0.984 po, section 0.139 po, OD 1.262 po. C'est une taille AS568, pas la grosseur du boyau.</p>
<p class="lead">Taille joint torique AS568 : le numéro de dash donne l'ID et la section. Ce tableau AS568 est un extrait. OD = ID + 2 × CS.</p>
${table(["Dash", "ID po", "CS po", "OD po", "ID mm"], AS568.map((o) => [o[0], o[1].toFixed(3), o[2].toFixed(3), (o[1] + 2 * o[2]).toFixed(3), mmPo(o[1])]))}
<p class="note">Extrait seulement. La liste AS568 au complet se cherche dans l'outil, par épaisseur ou par dash.</p>`
});

add({
  slug: "joints-toriques-metriques",
  h1: "Joints toriques métriques — tableau rapide",
  title: "Joints toriques métriques — tableau rapide | AtelierKit",
  description: "Joint torique métrique : la section 1/8 po fait 3.53 mm. Le dash 214 mesure 24.99 mm de trou. AtelierKit classe les AS568, pas une charte ISO inventée.",
  hash: "oring",
  cta: "Cherche en pouces ou en mm — essai de 30 jours",
  related: ["tableau-as568", "mesurer-joint-torique", "o-ring-size-chart"],
  faq: [
    { q: "Vous avez les codes ISO 3601 ?", a: "Non. On convertit les tailles AS568 en millimètres. Un code métrique du fabricant, c'est une autre charte." },
    { q: "3.53 mm, c'est quelle section ?", a: "0.139 po, soit 1/8 po. C'est la section courante sur un boyau." }
  ],
  body: `<p class="answer"><span>Réponse</span>1/8 po = 3.53 mm de section. Dash 214 : trou 24.99 mm, section 3.53 mm, dehors 32.05 mm.</p>
<p class="lead">Joint torique métrique : au comptoir, le O-ring est souvent encore un AS568, mesuré en pouces. Ce tableau rapide donne les mêmes tailles en mm (× 25.4). C'est pas une charte ISO inventée.</p>
${table(["Section", "po", "mm"], [["Mince", "0.070", mmPo(0.07)], ["Courante", "0.103", mmPo(0.103)], ["Boyau, 1/8", "0.139", mmPo(0.139)], ["Plus gros", "0.210", mmPo(0.21)], ["1/4", "0.275", mmPo(0.275)]])}
${table(["Dash", "ID mm", "CS mm", "OD mm"], [["214", mmPo(0.984), mmPo(0.139), mmPo(0.984 + 2 * 0.139)], ["210", mmPo(0.734), mmPo(0.139), mmPo(0.734 + 2 * 0.139)], ["112", mmPo(0.487), mmPo(0.103), mmPo(0.487 + 2 * 0.103)]])}`
});

add({
  slug: "trou-passage-vis-m8",
  h1: "Trou de passage (clearance) pour vis M8",
  title: "Trou de passage (clearance) pour vis M8 | AtelierKit",
  description: "Trou de passage vis M8, jeu normal : 9 mm (ISO 273). Serré 8.4 mm, large 10 mm. La mèche de taraud M8×1.25, c'est 6.8 mm, pas ça.",
  hash: "passage",
  cta: "Autres vis — essai de 30 jours",
  related: ["trou-degagement", "meche-taraud-m8", "percage-avant-taraudage"],
  faq: [
    { q: "Quel trou pour qu'une vis M8 passe ?", a: "9 mm en jeu normal. C'est le choix habituel si on t'a rien dit." },
    { q: "Je peux tarauder un trou de 9 mm en M8 ?", a: "Non. Pour tarauder M8×1.25, perce 6.8 mm. 9 mm, la vis passe, elle tient pas en filet." }
  ],
  body: `<p class="answer"><span>Réponse</span>Prends la mèche 9 mm. La vis M8 passe. Taraude pas ce trou. Jeu normal, choix habituel.</p>
<p class="lead">Le trou de passage (clearance) pour vis M8, série moyenne ISO 273 : <strong>${m8.normal.drill}</strong>. Serré : <strong>${m8.close.drill}</strong>. Large : <strong>${m8.loose.drill}</strong>.</p>
<p>La mèche de taraud, c'est plus petit : M8×1.25 → ${tapMet["M8×1.25"]} mm. Mélange pas les deux jobs.</p>
${table(["Jeu", "Mèche"], [["serré", m8.close.drill], ["normal", m8.normal.drill], ["large", m8.loose.drill]])}
<p class="note">Si on t'a rien dit, laisse normal.</p>`
});

add({
  slug: "trou-degagement",
  h1: "Diamètres de trou de dégagement — métrique et UNC",
  title: "Diamètres de trou de dégagement — chart métrique et UNC | AtelierKit",
  description: "Diamètre trou de dégagement et clearance hole chart métrique : M8 normal 9 mm, M10 11 mm, vis 1/4 po 9/32. Ce n'est pas la mèche de taraud.",
  hash: "passage",
  cta: "Toute la chart — essai de 30 jours",
  related: ["trou-passage-vis-m8", "meche-taraud-m8", "tableau-meche-taraud-metrique"],
  faq: [
    { q: "Dégagement, passage, clearance : c'est pareil ?", a: "Oui, au comptoir. Un trou plus grand que la vis, sans filet, pour qu'elle passe." },
    { q: "Quel jeu je prends ?", a: "Normal, si on t'a rien dit. Serré si les pièces sont percées ensemble. Large s'il y a de la peinture ou du jeu à rattraper." }
  ],
  body: `<p class="answer"><span>Réponse</span>M8 normal : 9 mm. M10 normal : 11 mm. Vis 1/4 po normal : 9/32 po. Taraude pas ces trous.</p>
<p class="lead">Diamètre trou de dégagement, clearance hole chart métrique et en pouces. Jeu normal (ISO 273 moyenne, ASME B18.2.8 normal). Extrait :</p>
${table(["Vis", "Serré", "Normal", "Large"], [
    ["M6", m6.close.drill, m6.normal.drill, m6.loose.drill],
    ["M8", m8.close.drill, m8.normal.drill, m8.loose.drill],
    ["M10", m10.close.drill, m10.normal.drill, m10.loose.drill],
    ["M12", m12.close.drill, m12.normal.drill, m12.loose.drill],
    ["1/4 po", qInch.close.drill, qInch.normal.drill, qInch.loose.drill],
    ["3/8 po", q38.close.drill, q38.normal.drill, q38.loose.drill],
    ["1/2 po", q12.close.drill, q12.normal.drill, q12.loose.drill]
  ])}
<p class="note">NPT et BSP, c'est du pipe, pas une vis. Pas de trou de passage ici pour eux. #12, 9/16 po et 2 po ne sont pas dans la table ASME : on devine pas.</p>`
});

add({
  slug: "meche-taraud-npt",
  h1: "Quelle mèche avant un taraud NPT ?",
  title: "Quelle mèche avant un taraud NPT ? | AtelierKit",
  description: "Taraud NPT quelle mèche : 1/8 NPT → Q (0.332 po), 1/4 NPT → 7/16 po, 3/8 NPT → 9/16 po. Pas de trou de passage pour un NPT.",
  hash: "taraud",
  cta: "Les autres NPT — essai de 30 jours",
  related: ["meche-taraud-1-4-20", "bsp-ou-npt", "percage-avant-taraudage"],
  faq: [
    { q: "Quelle mèche pour un 1/4 NPT ?", a: "7/16 po (0.438 po). Ensuite tu taraude 1/4-18 NPT." },
    { q: "C'est un trou de passage ?", a: "Non. NPT c'est du pipe. Il n'y a pas de clearance de bolt pour ça." }
  ],
  body: `<p class="answer"><span>Réponse</span>1/4 NPT : perce 7/16 po (0.438 po), puis taraude 1/4-18 NPT. Pas de trou de passage.</p>
<p class="lead">Taraud NPT quelle mèche : ce sont des mèches de pipe, pas le calcul à 75 % d'un bolt. 1/8 NPT prend la lettre Q.</p>
${table(["Taraud NPT", "Mèche", "po"], NPT.map((r) => [r[0], r[1], r[2] + " po"]))}
<p>Un 1/4-20, c'est un bolt : mèche #7. Un 1/4 NPT, c'est du pipe : mèche 7/16. Lis le bon avant de percer.</p>`
});

add({
  slug: "orfs-vs-jic",
  h1: "ORFS vs JIC : lequel t'as en main",
  title: "ORFS vs JIC : lequel t'as en main | AtelierKit",
  description: "Raccord ORFS vs JIC : JIC a un nez pointu à 37°. ORFS a une face plate avec un O-ring. Le -6 JIC et le -4 ORFS ont le même filet 9/16-18.",
  hash: "fitting",
  cta: "Regarde le bout dans l'outil — essai de 30 jours",
  related: ["reconnaitre-jic-37", "difference-jic-npt", "identifier-raccord-hydraulique"],
  faq: [
    { q: "Le filet est pareil ?", a: "Parfois. JIC -6 et ORFS -4 font tous les deux 9/16-18. C'est le bout qui n'est pas le même." },
    { q: "Ça visse ensemble ?", a: "Non. Le siège pointu du JIC ne scelle pas sur la face plate de l'ORFS." }
  ],
  body: `<p class="answer"><span>Réponse</span>Nez pointu, pas de caoutchouc : JIC. Face plate avec un O-ring dedans : ORFS. Même filet, des fois, mais pas le même siège.</p>
<p class="lead">Raccord ORFS vs JIC : les deux sont droits, les deux se mesurent sur le filet. Tu les mélanges si tu regardes juste le diamètre.</p>
<ul>
<li><strong>JIC 37°</strong> : le bout est pointu. L'étanchéité est sur le cône à 37°.</li>
<li><strong>ORFS</strong> : le bout est plat. L'O-ring est dans une gorge, dans la face.</li>
</ul>
<p>Exemple : 0.562 po, 18 filets. Ça peut être un mâle JIC -6 ou un ORFS -4. Sors pas la pièce avant d'avoir vu le bout.</p>`
});

add({
  slug: "reconnaitre-jic-37",
  h1: "Reconnaître un raccord JIC 37° en 30 secondes",
  title: "Reconnaître un raccord JIC 37° en 30 secondes | AtelierKit",
  description: "Identifier un raccord JIC 37 : nez pointu, pas d'O-ring sur le nez, filet droit. Un boyau 1/2 po JIC, c'est le dash -8, filet 3/4-16.",
  hash: "fitting",
  cta: "Mesure le filet JIC — essai de 30 jours",
  related: ["orfs-vs-jic", "difference-jic-npt", "identifier-raccord-hydraulique"],
  faq: [
    { q: "Le JIC a un O-ring ?", a: "Pas sur le nez. S'il y a un O-ring dans une face plate, c'est de l'ORFS. S'il est à la base d'un filet droit, c'est souvent de l'ORB." },
    { q: "C'est quoi le 37° ?", a: "L'angle du siège, le nez pointu. C'est là que ça scelle, pas dans les filets." }
  ],
  body: `<p class="answer"><span>Réponse</span>Nez pointu, comme un chapeau, sans caoutchouc dessus. Filet droit. Ça, c'est du JIC 37°.</p>
<p class="lead">Identifier un raccord JIC 37, ça prend le bout, pas le sac. En 30 secondes :</p>
<ol>
<li>Le nez est pointu. Pas plat.</li>
<li>Pas d'O-ring sur le nez, ni dans la face.</li>
<li>Le filet est droit. Il serre pas de plus en plus comme un NPT.</li>
</ol>
${table(["Boyau", "Dash", "Filet JIC"], [["1/4 po", "-4", "7/16-20"], ["3/8 po", "-6", "9/16-18"], ["1/2 po", "-8", "3/4-16"], ["3/4 po", "-12", "1-1/16-12"]])}
<p>Le -6 JIC (9/16-18) a le même filet qu'un ORFS -4. Regarde le nez avant de sortir la pièce.</p>`
});

add({
  slug: "percage-avant-taraudage",
  h1: "Perçage avant taraudage — règle simple",
  title: "Perçage avant taraudage — règle simple | AtelierKit",
  description: "Perçage avant taraudage : laisse 75 % de filet. M8×1.25 → 6.8 mm. 1/4-20 → mèche #7 (0.201 po). Ce n'est pas le trou de passage.",
  hash: "taraud",
  cta: "La calculatrice — essai de 30 jours",
  related: ["calculatrice-taraudage", "meche-taraud-m8", "meche-taraud-1-4-20", "trou-passage-vis-m8"],
  faq: [
    { q: "Je perce aussi gros que la vis ?", a: "Non. Le trou est plus petit. Le taraud coupe le filet dans ce qui reste." },
    { q: "75 %, je peux changer ?", a: "Oui, dans l'outil. Si on t'a rien dit, laisse 75. Plus gros, le filet est faible. Plus petit, le taraud casse." }
  ],
  body: `<p class="answer"><span>Réponse</span>Perce plus petit que la vis, à 75 %. M8×1.25 → 6.8 mm. 1/4-20 → #7 (0.201 po). Puis tu taraude.</p>
<p class="lead">Le perçage avant taraudage, c'est une seule règle : le trou est plus petit que la vis. Le taraud (tap) coupe le filet dans le métal qui reste. À 75 % de filet, c'est le trou d'habitude.</p>
<ul>
<li>Métrique gros : M6×1 → ${tapMet["M6×1"]} mm, M8×1.25 → 6.8 mm, M10×1.5 → 8.5 mm.</li>
<li>Pouces : 1/4-20 → #7, 0.201 po. Le fin 1/4-28 → #3.</li>
<li>Pipe NPT : autre charte. 1/4 NPT → 7/16 po. Pas le calcul du bolt.</li>
</ul>
<p>Le trou de passage, c'est l'autre job : la vis traverse, tu taraude pas. M8 normal = 9 mm. 1/4 po normal = 9/32 po.</p>`
});

add({
  slug: "calculatrice-taraudage",
  h1: "Calculatrice taraudage en ligne (métrique et UNC)",
  title: "Calculatrice taraudage en ligne (métrique & UNC) | AtelierKit",
  description: "Calculatrice taraudage en ligne : M8×1.25 donne 6.8 mm, 1/4-20 donne la mèche #7 (0.201 po). Gros et fin ne donnent pas la même mèche.",
  hash: "taraud",
  cta: "Ouvre la calculatrice — essai de 30 jours",
  related: ["percage-avant-taraudage", "tableau-meche-taraud-metrique", "meche-taraud-1-4-20"],
  faq: [
    { q: "Elle fait le métrique et le pouce ?", a: "Oui. M3 à M24, UNC, UNF, et les mèches NPT à part." },
    { q: "Le résultat est le trou de passage ?", a: "Non. La calculatrice donne la mèche avant le taraud. Le passage est un autre écran." }
  ],
  body: `<p class="answer"><span>Deux exemples</span>M8×1.25 → 6.8 mm. 1/4-20 → mèche #7, 0.201 po. Tu perces, puis tu taraude.</p>
<p class="lead">La calculatrice taraudage en ligne d'AtelierKit prend le filet écrit sur le bon et te dit la mèche. Métrique et UNC, à 75 % si tu changes rien.</p>
${table(["Tu écris", "Tu perces"], [["M8×1.25", "6.8 mm"], ["M8×1", "7.0 mm"], ["M10×1.5", "8.5 mm"], ["1/4-20", "#7 · 0.201 po"], ["1/4-28", "#3 · " + q1428.po + " po"]])}
<p>Le pourcentage se règle dans l'outil. Le trou de passage (9 mm pour une vis M8) n'est pas ce calcul.</p>`
});

add({
  slug: "types-raccords-hydrauliques",
  h1: "Types de raccords hydrauliques — guide débutant",
  title: "Types de raccords hydrauliques — guide débutant | AtelierKit",
  description: "Raccord hydraulique type : JIC 37°, ORFS, NPT, BSPP, ORB. Tu les sépares par le bout, pas par le chiffre écrit sur le boyau.",
  hash: "fitting",
  cta: "Identifie le type — essai de 30 jours",
  related: ["identifier-raccord-hydraulique", "orfs-vs-jic", "bsp-ou-npt", "magasinier-usinage"],
  faq: [
    { q: "Le chiffre sur le boyau suffit ?", a: "Non. 1/2 po peut être le boyau (JIC -8) ou un pipe NPT plus gros. Regarde le bout." },
    { q: "ORFS et JIC, c'est le même type ?", a: "Non. JIC est pointu à 37°. ORFS est plat avec un O-ring dans la face." }
  ],
  body: `<p class="answer"><span>Réponse</span>Cinq types au comptoir : JIC, ORFS, NPT, BSPP, ORB. Le bout les sépare.</p>
<p class="lead">Quel raccord hydraulique type t'as en main? Le nom sur le boyau ne suffit pas. Voici les types qu'on voit tout le temps.</p>
<ul>
<li><strong>JIC 37°</strong> : nez pointu, filet droit, siège à 37°.</li>
<li><strong>ORFS</strong> : face plate, O-ring dans la face.</li>
<li><strong>NPT</strong> : pipe américain, filet en cône.</li>
<li><strong>BSPP</strong> : pipe gaz, souvent droit, joint sur la face.</li>
<li><strong>ORB / SAE</strong> : filet droit, O-ring à la base, pour un port.</li>
</ul>
<p>Mâle : filet dehors. Femelle : filet dedans. Mesure sur le filet, pas dans le fond. Exemple : 0.562 po.</p>`
});

add({
  slug: "magasinier-usinage",
  h1: "Outil pour magasinier d'usinage — AtelierKit",
  title: "Outil pour magasinier d'usinage — AtelierKit",
  description: "Outil magasinier usinage : quelle mèche pour le taraud, quel trou de passage, quel fitting, quel O-ring. Essai de 30 jours, en français de shop.",
  hash: "fitting",
  cta: "Pars de la pièce que t'as en main",
  related: ["identifier-raccord-hydraulique", "percage-avant-taraudage", "tableau-as568", "trou-degagement"],
  faq: [
    { q: "Ça remplace le catalogue ?", a: "Pour la question du comptoir, oui : mèche, passage, fitting, O-ring. Les dessins de séries sont dans l'outil." },
    { q: "C'est gratuit ?", a: "Essai de 30 jours dès la première recherche. Après, 9 $ par mois ou 79 $ par année. Les guides comme celui-ci restent lisibles." }
  ],
  body: `<p class="answer"><span>Pour le comptoir</span>Quatre jobs : c'est quoi ce fitting, quel O-ring, quelle mèche de taraud, quel trou de passage.</p>
<p class="lead">Un outil pour magasinier d'usinage, au premier jour, ça doit répondre sans cours. AtelierKit part de la pièce ou du bon : magasinier usinage, mèche, fitting, O-ring.</p>
<ul>
<li><a href="/guides/identifier-raccord-hydraulique">J'ai un raccord, c'est quoi?</a></li>
<li><a href="/guides/meche-taraud-m8">Quelle mèche pour un taraud M8?</a> 6.8 mm.</li>
<li><a href="/guides/meche-taraud-1-4-20">Quelle mèche pour un 1/4-20?</a> #7.</li>
<li><a href="/guides/trou-passage-vis-m8">Quel trou pour une vis M8?</a> 9 mm, et tu taraude pas.</li>
<li><a href="/guides/mesurer-joint-torique">Quel O-ring?</a> Mesure la section, puis le trou.</li>
</ul>
<p>L'essai dure 30 jours. Le mode hors ligne, c'est pour les abonnés.</p>`
});

add({
  slug: "o-ring-size-chart",
  h1: "O-ring size chart en français",
  title: "O-ring size chart en français | AtelierKit",
  description: "O-ring size chart en français : dash AS568, ID, section (CS) et OD. Exemple 214 : ID 0.984 po, CS 0.139 po, OD 1.262 po. Extrait, pas la charte complète.",
  hash: "oring",
  cta: "Toute la charte O-ring — essai de 30 jours",
  related: ["tableau-as568", "mesurer-joint-torique", "joints-toriques-metriques"],
  faq: [
    { q: "ID, CS, OD : c'est quoi ?", a: "ID le trou, CS l'épaisseur du rond (section), OD le dehors. OD = ID + 2 × CS." },
    { q: "La charte est complète ici ?", a: "Non. Six dash courants. Le reste de l'AS568 est dans l'outil." }
  ],
  body: `<p class="answer"><span>Réponse</span>Dash 214 : ID 0.984 po (24.99 mm), section 0.139 po (3.53 mm), OD 1.262 po.</p>
<p class="lead">O-ring size chart en français, extrait AS568. Le dash n'est pas la grosseur du boyau. Mesure la section en premier.</p>
${table(["Dash", "ID (trou)", "CS (section)", "OD (dehors)"], AS568.map((o) => [o[0], o[1].toFixed(3) + " po", o[2].toFixed(3) + " po", (o[1] + 2 * o[2]).toFixed(3) + " po"]))}
<p class="note">Size chart partielle. Pour chercher par mesure, ouvre l'outil.</p>`
});

const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
for (const page of pages) {
  page.url = `${SITE}/guides/${page.slug}`;
  for (const slug of page.related) {
    if (!bySlug[slug]) throw new Error("missing related " + slug);
  }
}

const guidesDir = path.join(root, "guides");
for (const page of pages) {
  const dir = path.join(guidesDir, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), layout(page, pages));
}

const indexBody = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guides AtelierKit — mèches, fittings, O-rings</title>
<meta name="description" content="Guides de comptoir : mèche pour taraud M8, 1/4-20, trou de passage, JIC vs NPT, O-ring AS568. Essai de 30 jours dans l'outil.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE}/guides">
<meta property="og:title" content="Guides AtelierKit — mèches, fittings, O-rings">
<meta property="og:description" content="Réponses courtes pour le shop, puis l'outil. Essai de 30 jours.">
<meta property="og:url" content="${SITE}/guides">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_CA">
<link rel="stylesheet" href="/guides/guide.css">
</head>
<body>
<header>
  <a href="/">AK AtelierKit</a>
  <nav><a href="/">L'outil</a><a href="/tarifs">Essai 30 jours</a></nav>
</header>
<main>
<h1>Guides pour le comptoir</h1>
<p class="lead">Une réponse courte, vérifiée avec les mêmes chiffres que l'outil. La charte complète et la recherche, c'est l'essai de 30 jours.</p>
<ul>
${pages.map((p) => `<li><a href="/guides/${p.slug}">${esc(p.h1)}</a></li>`).join("\n")}
</ul>
</main>
<footer>AtelierKit · <a href="/">L'outil</a> · <a href="/tarifs">Essai de 30 jours, puis 9 $/mois</a></footer>
</body>
</html>
`;
fs.writeFileSync(path.join(guidesDir, "index.html"), indexBody);

const urls = ["/", "/tarifs", "/guides", ...pages.map((p) => "/guides/" + p.slug)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

console.log("pages", pages.length);