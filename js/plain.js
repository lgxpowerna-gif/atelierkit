/* Plain-language shop answers. Formatting only: diameters are passed in.
   Clearance drills are never computed here, and a failed read never invents a bit. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKPlain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var IN = 25.4;
  var DEFAULT_FIT = "normal";

  var FAMILIES = [
    { id: "UNC", fr: "Gros (UNC)", en: "Coarse (UNC)" },
    { id: "UNF", fr: "Fin (UNF)", en: "Fine (UNF)" },
    { id: "MET", fr: "Métrique", en: "Metric" },
    { id: "NPT", fr: "Pipe (NPT)", en: "Pipe (NPT)" },
    { id: "BSPP", fr: "BSP (gaz)", en: "BSP (gas)" }
  ];

  var COMMON_TAPS = [
    { label: "1/4-20", family: "UNC", name: "1/4-20" },
    { label: "5/16-18", family: "UNC", name: "5/16-18" },
    { label: "3/8-16", family: "UNC", name: "3/8-16" },
    { label: "1/2-13", family: "UNC", name: "1/2-13" },
    { label: "1/4-28", family: "UNF", name: "1/4-28" },
    { label: "M6", family: "MET", name: "M6×1" },
    { label: "M8", family: "MET", name: "M8×1.25" },
    { label: "M10", family: "MET", name: "M10×1.5" },
    { label: "M10 fin", family: "MET", name: "M10×1.25" },
    { label: "1/4 NPT", family: "NPT", name: "1/4-18" },
    { label: "3/8 NPT", family: "NPT", name: "3/8-18" },
    { label: "1/2 NPT", family: "NPT", name: "1/2-14" }
  ];

  var COMMON_CLEAR = [
    { family: "IN", key: "1/4", fr: "1/4 po", en: "1/4 in" },
    { family: "IN", key: "5/16", fr: "5/16 po", en: "5/16 in" },
    { family: "IN", key: "3/8", fr: "3/8 po", en: "3/8 in" },
    { family: "IN", key: "1/2", fr: "1/2 po", en: "1/2 in" },
    { family: "IN", key: "5/8", fr: "5/8 po", en: "5/8 in" },
    { family: "IN", key: "3/4", fr: "3/4 po", en: "3/4 in" },
    { family: "MM", key: "M6", fr: "M6", en: "M6" },
    { family: "MM", key: "M8", fr: "M8", en: "M8" },
    { family: "MM", key: "M10", fr: "M10", en: "M10" },
    { family: "MM", key: "M12", fr: "M12", en: "M12" }
  ];

  var FIT_SHORTCUTS = ["JIC", "ORFS", "NPT", "90", "bride", "bouchon"];
  var ORING_SHORTCUTS = ["112", "210", "214", "222"];

  var ALIASES = {
    bouchon: ["bouchon", "plug", "cap"],
    bride: ["bride", "flange"],
    coude: ["coude", "elbow", "90"],
    ecrou: ["ecrou", "écrou", "nut"],
    "écrou": ["écrou", "ecrou", "nut"],
    te: ["te", "tee", "té"],
    "té": ["té", "tee"],
    droit: ["droit", "straight"],
    plug: ["plug", "cap", "bouchon"],
    cap: ["cap", "plug"]
  };

  function en(lang) { return lang === "en"; }
  function po(inches, lang) {
    return Number(inches).toFixed(3) + (en(lang) ? " in" : " po");
  }
  function mm(inches) {
    return (Number(inches) * IN).toFixed(2) + " mm";
  }
  function both(inches, lang) {
    return po(inches, lang) + " · " + mm(inches);
  }

  function fracInches(n) {
    n = Math.abs(n);
    var w = Math.floor(n + 1e-9);
    var num = Math.round((n - w) * 64);
    if (num === 64) return (w + 1) + '"';
    if (!num) return w + '"';
    var a = num, b = 64, t;
    while (b) { t = a % b; a = b; b = t; }
    return (w ? w + " " : "") + (num / a) + "/" + (64 / a) + '"';
  }

  function nearestBit(inches, letters, numbers) {
    var best = fracInches(inches);
    var bd = Math.abs(Math.round(inches * 64) / 64 - inches);
    var k, d;
    letters = letters || {};
    numbers = numbers || {};
    for (k in letters) {
      if (!Object.prototype.hasOwnProperty.call(letters, k)) continue;
      d = Math.abs(letters[k] - inches);
      if (d < bd) { bd = d; best = k; }
    }
    for (k in numbers) {
      if (!Object.prototype.hasOwnProperty.call(numbers, k)) continue;
      d = Math.abs(numbers[k] - inches);
      if (d < bd) { bd = d; best = "#" + k; }
    }
    return best;
  }

  function describeTap(o) {
    var lang = o.lang;
    var metric = o.family === "MET";
    var pipe = o.family === "NPT" || o.family === "BSPP";
    var sized = metric
      ? o.shop + " (" + po(o.inches, lang) + ")"
      : o.shop + " (" + both(o.inches, lang) + ")";
    var call = o.name + (o.family === "NPT" ? " NPT" : o.family === "BSPP" ? " BSP" : "");
    var action = en(lang)
      ? "Drill with a " + sized + " bit, then tap " + call + "."
      : "Prends la mèche " + sized + ". Taraude " + call + ".";
    if (pipe) {
      action += en(lang)
        ? " No clearance hole: this is not a bolt."
        : " Pas de trou de passage : c'est du pipe, pas une vis.";
    }
    return { bit: o.shop, action: action };
  }

  function describeClearance(hit, lang) {
    if (!hit || hit.drill == null) return null;
    var metric = hit.family === "MM";
    var fitWord = en(lang)
      ? { close: "Close", normal: "Normal", loose: "Loose" }
      : { close: "serré", normal: "normal", loose: "large" };
    var fit = fitWord[hit.fit] || fitWord.normal;
    var bolt = metric ? hit.key : hit.key + (en(lang) ? " in" : " po");
    var sized = metric
      ? hit.drill + " (" + (hit.min / IN).toFixed(3) + (en(lang) ? " in)" : " po)")
      : hit.drill + (en(lang) ? " in" : " po") + " (" + (hit.min * IN).toFixed(2) + " mm)";
    var usual = hit.fit === "normal" || !hit.fit
      ? (en(lang) ? " Usual choice." : " Choix habituel.")
      : "";
    var action = en(lang)
      ? "Pull a " + sized + " drill. The " + bolt + " bolt passes through. Do not tap this hole. " + fit + " fit." + usual
      : "Prends la mèche " + sized + ". La vis " + bolt + " passe. Taraude pas ce trou. Jeu " + fit + "." + usual;
    return {
      bit: metric ? hit.drill : hit.drill + (en(lang) ? " in" : " po"),
      action: action
    };
  }

  function describeDrill(o) {
    var lang = o.lang;
    var name = o.name || "—";
    var asked = both(o.inches, lang);
    var far = o.bitInches == null || Math.abs(o.bitInches - o.inches) > 0.01;
    var action;
    if (far && o.bitInches != null) {
      var near = both(o.bitInches, lang);
      action = en(lang)
        ? "You asked for " + asked + ". Closest letter or number bit: " + name + " (" + near + "). This is not the tap drill and not the clearance hole. To cut a thread, open Taps."
        : "Tu as demandé " + asked + ". La mèche (drill) la plus proche : " + name + " (" + near + "). C'est pas la mèche de taraud, pis c'est pas le trou de passage. Pour un filet, ouvre Tarauds.";
    } else {
      action = en(lang)
        ? "Bit " + name + ": " + asked + ". This is not the tap drill and not the clearance hole. To cut a thread, open Taps. To let a bolt through, open Clearance."
        : "Mèche " + name + " : " + asked + ". C'est pas la mèche de taraud, pis c'est pas le trou de passage. Pour un taraud, ouvre Tarauds. Pour une vis qui passe, ouvre Passage.";
    }
    return { bit: name, action: action };
  }

  function describeFitting(o) {
    var lang = o.lang;
    var who = o.sex === "F" ? (en(lang) ? "female" : "femelle") : (en(lang) ? "male" : "mâle");
    var name = who + " " + o.fam + " " + o.dash;
    var thread = o.thread || "";
    var bit = name;
    var action;
    if (!o.close) {
      action = en(lang)
        ? "Not within 1.5 mm (off by " + o.distanceMm + " mm). Check in or mm, and measure on the threads, not in the groove. Closest: " + name + ", thread " + thread + "."
        : "C'est loin (" + o.distanceMm + " mm). Vérifie po ou mm. Mesure sur le filet, pas dans le fond. Le plus proche : " + name + ", filet " + thread + ".";
    } else if (o.many) {
      action = en(lang)
        ? "Several fittings are close. Look at the nose before you pull a part: pointed = JIC, flat with a ring = ORFS, tapered = NPT. Closest: " + name + ", thread " + thread + "."
        : "Sors le plus proche : " + name + ", filet " + thread + ". Y'en a d'autres. Regarde le bout : pointu = JIC, plat avec O-ring = ORFS, cône = NPT.";
    } else {
      action = en(lang)
        ? "Pull: " + name + ", thread " + thread + "."
        : "Sors le fitting : " + name + ", filet " + thread + ".";
    }
    return { bit: bit, action: action };
  }

  function describeAsked(o) {
    var lang = o.lang;
    var bit = (en(lang) ? "Dash " : "Numéro ") + o.dash;
    var action = en(lang)
      ? "Hose " + o.tube + ". Pull dash " + o.dash + ", then check the nose. " + o.note
      : "Boyau " + o.tube + ". Sors le dash " + o.dash + ", pis check le bout. " + o.note;
    return { bit: bit, action: action };
  }

  function looksLikeThread(raw) {
    var s = String(raw || "").trim();
    if (!s) return false;
    if (/npt|bsp|unf|unc/i.test(s)) return true;
    if (/^m\s*\d/i.test(s)) return true;
    if (/^g\s*\d/i.test(s)) return true;
    if (/^#\s*\d+\s*-\s*\d+/.test(s)) return true;
    if (/^\d+\s*\/\s*\d+\s*-\s*\d+/.test(s)) return true;
    if (/^\d+\s*-\s*\d+/.test(s) && !/^\d+\s*-\s*\d+\s*\/\s*\d+/.test(s)) return true;
    return false;
  }

  function emptyHint(kind, lang) {
    var fr = {
      "bad-measure": "Je lis pas ça. Essaie 0.562 po, 14.3 mm ou 9/16. Le point ou la virgule, les deux marchent. Pour un filet comme 1/4-20 ou M10x1.5, ouvre Tarauds.",
      drill: "Je lis pas cette grosseur. Essaie 0.250 po, 5/32 ou 6.5 mm. Pour un taraud, ouvre Tarauds. Pour une vis qui passe, ouvre Passage.",
      "drill-thread": "Ça a l'air d'un filet, pas d'une mèche. Ouvre Tarauds pour 1/4-20, M10x1.5 ou 3/8 NPT. Pour une vis qui passe, ouvre Passage.",
      oring: "Pas de dash exact. Essaie 214 sans le tiret, ou prends l'épaisseur (souvent 1/8 po sur un boyau).",
      fitting: "Rien avec tous ces mots. Essaie un seul : JIC, ORFS, NPT, 90, bride ou bouchon. Ou un numéro comme 2404.",
      "clear-missing": "Pas dans la table, pis on devine pas de mèche. Essaie 1/4 po, 3/8 po, 1/2 po, M6, M8 ou M10. #12, 9/16 po, 11/16 po, 2 po, NPT et BSP, c'est pas des vis ici.",
      "clear-aside": "Pas de mèche devinée pour #12, 9/16 po, 11/16 po, 2 po, NPT ou BSP. Pour du pipe, ouvre Tarauds."
    };
    var english = {
      "bad-measure": "Can't read that measurement. Try 0.562 in, 14.3 mm or 9/16. Dot and comma both work. For a thread such as 1/4-20 or M10x1.5, open Taps.",
      drill: "Can't read that size. Try 0.250 in, 5/32 or 6.5 mm. For a thread, open Taps. To let a bolt through, open Clearance.",
      "drill-thread": "That looks like a thread, not a drill. Open Taps for 1/4-20, M10x1.5 or 3/8 NPT. To let a bolt pass through, open Clearance.",
      oring: "No exact dash. Try 214 without the hyphen, or pick the thickness (often 1/8 in on a hose) then the hole.",
      fitting: "No fitting contains every word. Try one word: JIC, ORFS, NPT, 90, flange or plug. Or a number such as 2404.",
      "clear-missing": "Not in the table, and no drill is guessed. Try 1/4 in, 3/8 in, 1/2 in, M6, M8 or M10. #12, 9/16 in, 11/16 in, 2 in, NPT and BSP are not bolts here.",
      "clear-aside": "No drill is guessed for #12, 9/16 in, 11/16 in, 2 in, NPT or BSP. For pipe thread, open Taps."
    };
    var table = en(lang) ? english : fr;
    return table[kind] || table["bad-measure"];
  }

  function fitAdvice(fit, lang) {
    var fr = {
      close: "Jeu serré (H12) : peu de jeu. Les trous sont alignés, souvent percés ensemble.",
      normal: "Jeu normal (H13) : choix habituel au shop. Laisse-le si on t'a rien dit d'autre.",
      loose: "Jeu large, aussi appelé libre (H14) : plus de jeu. Peinture, trous un peu croches, montage sur le tas."
    };
    var english = {
      close: "Close fit (H12): little play. Holes line up, often drilled together.",
      normal: "Normal fit (H13): the usual choice. Leave this if nobody told you otherwise.",
      loose: "Loose fit, also called large (H14): more play. Paint, slightly shifted holes, field assembly."
    };
    var table = en(lang) ? english : fr;
    return table[fit] || table.normal;
  }

  function lexicon(lang) {
    if (en(lang)) {
      return [
        { word: "Tap", plain: "The tool that cuts the thread in the hole. Drill first, then run the tap." },
        { word: "Clearance", plain: "A hole larger than the bolt, with no thread. The bolt passes through." },
        { word: "Pitch", plain: "The spacing of the threads. 1/4-20 means 20 threads per inch. M10×1.5 means 1.5 mm between threads. Pitch changes the tap drill, not the clearance hole." },
        { word: "NPT", plain: "American pipe thread, tapered. The more you tighten, the harder it seals. It is not a bolt. Do not mix it with BSP." },
        { word: "BSP", plain: "Gas pipe thread, often straight (BSPP) with a flat washer. An NPT will not seal properly in a BSP." },
        { word: "Section (CS)", plain: "The thickness of the O-ring rubber. Measure it first. 1/8 in is common on hoses." },
        { word: "Close fit", plain: "Little play. Holes line up, often drilled together." },
        { word: "Normal fit", plain: "The usual choice. Leave Normal if nobody told you otherwise." },
        { word: "Loose fit", plain: "More play (also called large). Paint, holes a bit off, assembly on the job." }
      ];
    }
    return [
      { word: "Taraud", plain: "Le taraud (tap) coupe le filet dans le trou. Tu perces d'abord avec la mèche (drill), pis tu passes le taraud." },
      { word: "Passage", plain: "Trou de passage (clearance) : plus grand que la vis, sans filet. La vis passe au travers." },
      { word: "Pas", plain: "L'écart entre les filets. 1/4-20, c'est 20 filets par pouce. M10×1.5, c'est 1,5 mm entre les filets. Le pas change la mèche de taraud, pas le trou de passage." },
      { word: "NPT", plain: "Filet de pipe américain, en cône. Plus tu visses, plus ça serre. C'est pas un bolt. Mélange pas ça avec du BSP." },
      { word: "BSP", plain: "Filet de pipe gaz, souvent droit (BSPP) avec un joint plat. Un NPT scelle pas bien dans un BSP." },
      { word: "Section (CS)", plain: "L'épaisseur du rond du O-ring. Mesure ça en premier. 1/8 po, c'est courant sur les boyaux." },
      { word: "Jeu serré", plain: "Peu de jeu. Les trous sont alignés, souvent percés ensemble." },
      { word: "Jeu normal", plain: "Le choix habituel au shop. Laisse Normal si on t'a rien dit." },
      { word: "Jeu large", plain: "Plus de jeu (aussi appelé libre). Peinture, trous un peu croches, montage sur le tas." }
    ];
  }

  function searchWords(token) {
    var t = String(token || "").toLowerCase();
    var extra = ALIASES[t];
    return extra ? extra.slice() : [t];
  }

  return {
    DEFAULT_FIT: DEFAULT_FIT,
    FAMILIES: FAMILIES,
    COMMON_TAPS: COMMON_TAPS,
    COMMON_CLEAR: COMMON_CLEAR,
    FIT_SHORTCUTS: FIT_SHORTCUTS,
    ORING_SHORTCUTS: ORING_SHORTCUTS,
    nearestBit: nearestBit,
    describeTap: describeTap,
    describeClearance: describeClearance,
    describeDrill: describeDrill,
    describeFitting: describeFitting,
    describeAsked: describeAsked,
    looksLikeThread: looksLikeThread,
    emptyHint: emptyHint,
    fitAdvice: fitAdvice,
    lexicon: lexicon,
    searchWords: searchWords
  };
});
