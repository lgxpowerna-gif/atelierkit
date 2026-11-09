/* Bolt clearance holes vs tap-drill diameter.
   Clearance numbers are transcribed from published tables. They are never
   computed from the tap-drill formula and never taken as the nominal diameter.
   Inch: ASME B18.2.8-1999 Table 1a (close / normal / loose), also printed in
   Machinery's Handbook (29th–31st) from that standard.
   Metric: ISO 273:1979 Table 1 (fine / medium / coarse), confirmed 2024.
   The same nominal drills appear in ASME B18.2.8 Table 3. Tolerance classes
   named by both standards: H12 close/fine, H13 normal/medium, H14 loose/coarse.
   Pipe threads are not bolts and are rejected here. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKHoles = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var TAP_CONSTANT = 1.299038105676658;
  var PIPE_FAMILIES = ["NPT", "NPS", "NPSM", "BSP", "BSPP", "BSPT", "G"];
  /* Designations already used as pipe taps in this app. Not clearance cases. */
  var PIPE_KEYS = {
    "1/16-27": true, "1/8-27": true, "1/4-18": true, "3/8-18": true,
    "1/2-14": true, "3/4-14": true, "1-11.5": true, "1-1/4-11.5": true,
    "1-1/2-11.5": true, "2-11.5": true,
    "G1/8-28": true, "G1/4-19": true, "G3/8-19": true, "G1/2-14": true,
    "G3/4-14": true, "G1-11": true
  };
  /* Inch sizes a shop might ask for that ASME B18.2.8 Table 1a does not list. */
  var INCH_NOT_LISTED = ["#12", "9/16", "11/16", "2"];
  var SOURCES = {
    inch: "ASME B18.2.8-1999 Table 1a (close, normal, loose). Also Machinery's Handbook, clearance holes for inch fasteners.",
    metric: "ISO 273:1979 (fine, medium, coarse), still current after the 2024 review. Same nominal drills in ASME B18.2.8 Table 3.",
    fits: "H12 serré / close / fine. H13 normal / medium. H14 libre / loose / coarse."
  };

  function fitHole(drill, min, max) {
    return { drill: drill, min: min, max: max };
  }
  function mmHole(mm) {
    return { drill: (mm % 1 ? String(mm) : String(mm)) + " mm", min: mm, max: null, mm: mm };
  }

  /* nominal is the bolt/screw diameter, not the drill. */
  var CLEAR_IN = [
    { key: "#0", nominal: 0.060, unc: null, unf: "#0-80",
      close: fitHole("#51", 0.067, 0.071), normal: fitHole("#48", 0.076, 0.082), loose: fitHole("3/32", 0.094, 0.104) },
    { key: "#1", nominal: 0.073, unc: "#1-64", unf: "#1-72",
      close: fitHole("#46", 0.081, 0.085), normal: fitHole("#43", 0.089, 0.095), loose: fitHole("#37", 0.104, 0.114) },
    { key: "#2", nominal: 0.086, unc: "#2-56", unf: "#2-64",
      close: fitHole("3/32", 0.094, 0.098), normal: fitHole("#38", 0.102, 0.108), loose: fitHole("#32", 0.116, 0.126) },
    { key: "#3", nominal: 0.099, unc: "#3-48", unf: "#3-56",
      close: fitHole("#36", 0.106, 0.110), normal: fitHole("#32", 0.116, 0.122), loose: fitHole("#30", 0.128, 0.140) },
    { key: "#4", nominal: 0.112, unc: "#4-40", unf: "#4-48",
      close: fitHole("#31", 0.120, 0.124), normal: fitHole("#30", 0.128, 0.135), loose: fitHole("#27", 0.144, 0.156) },
    { key: "#5", nominal: 0.125, unc: "#5-40", unf: "#5-44",
      close: fitHole("9/64", 0.141, 0.146), normal: fitHole("5/32", 0.156, 0.163), loose: fitHole("11/64", 0.172, 0.184) },
    { key: "#6", nominal: 0.138, unc: "#6-32", unf: "#6-40",
      close: fitHole("#23", 0.154, 0.159), normal: fitHole("#18", 0.170, 0.177), loose: fitHole("#13", 0.185, 0.197) },
    { key: "#8", nominal: 0.164, unc: "#8-32", unf: "#8-36",
      close: fitHole("#15", 0.180, 0.185), normal: fitHole("#9", 0.196, 0.203), loose: fitHole("#3", 0.213, 0.225) },
    { key: "#10", nominal: 0.190, unc: "#10-24", unf: "#10-32",
      close: fitHole("#5", 0.206, 0.211), normal: fitHole("#2", 0.221, 0.228), loose: fitHole("B", 0.238, 0.250) },
    { key: "1/4", nominal: 0.250, unc: "1/4-20", unf: "1/4-28",
      close: fitHole("17/64", 0.266, 0.272), normal: fitHole("9/32", 0.281, 0.290), loose: fitHole("19/64", 0.297, 0.311) },
    { key: "5/16", nominal: 0.3125, unc: "5/16-18", unf: "5/16-24",
      close: fitHole("21/64", 0.328, 0.334), normal: fitHole("11/32", 0.344, 0.354), loose: fitHole("23/64", 0.359, 0.373) },
    { key: "3/8", nominal: 0.375, unc: "3/8-16", unf: "3/8-24",
      close: fitHole("25/64", 0.391, 0.397), normal: fitHole("13/32", 0.406, 0.416), loose: fitHole("27/64", 0.422, 0.438) },
    { key: "7/16", nominal: 0.4375, unc: "7/16-14", unf: "7/16-20",
      close: fitHole("29/64", 0.453, 0.460), normal: fitHole("15/32", 0.469, 0.479), loose: fitHole("31/64", 0.484, 0.500) },
    { key: "1/2", nominal: 0.500, unc: "1/2-13", unf: "1/2-20",
      close: fitHole("17/32", 0.531, 0.538), normal: fitHole("9/16", 0.562, 0.572), loose: fitHole("39/64", 0.609, 0.625) },
    { key: "5/8", nominal: 0.625, unc: "5/8-11", unf: "5/8-18",
      close: fitHole("21/32", 0.656, 0.663), normal: fitHole("11/16", 0.688, 0.698), loose: fitHole("47/64", 0.734, 0.754) },
    { key: "3/4", nominal: 0.750, unc: "3/4-10", unf: "3/4-16",
      close: fitHole("25/32", 0.781, 0.789), normal: fitHole("13/16", 0.812, 0.824), loose: fitHole("29/32", 0.906, 0.926) },
    { key: "7/8", nominal: 0.875, unc: "7/8-9", unf: "7/8-14",
      close: fitHole("29/32", 0.906, 0.914), normal: fitHole("15/16", 0.938, 0.950), loose: fitHole("1-1/32", 1.031, 1.051) },
    { key: "1", nominal: 1, unc: "1-8", unf: "1-12",
      close: fitHole("1-1/32", 1.031, 1.039), normal: fitHole("1-3/32", 1.094, 1.106), loose: fitHole("1-5/32", 1.156, 1.181) },
    { key: "1-1/8", nominal: 1.125, unc: "1-1/8-7", unf: "1-1/8-12",
      close: fitHole("1-5/32", 1.156, 1.164), normal: fitHole("1-7/32", 1.219, 1.235), loose: fitHole("1-5/16", 1.312, 1.337) },
    { key: "1-1/4", nominal: 1.25, unc: "1-1/4-7", unf: "1-1/4-12",
      close: fitHole("1-9/32", 1.281, 1.291), normal: fitHole("1-11/32", 1.344, 1.360), loose: fitHole("1-7/16", 1.438, 1.463) },
    { key: "1-3/8", nominal: 1.375, unc: "1-3/8-6", unf: "1-3/8-12",
      close: fitHole("1-7/16", 1.438, 1.448), normal: fitHole("1-1/2", 1.500, 1.516), loose: fitHole("1-39/64", 1.609, 1.634) },
    { key: "1-1/2", nominal: 1.5, unc: "1-1/2-6", unf: "1-1/2-12",
      close: fitHole("1-9/16", 1.562, 1.572), normal: fitHole("1-5/8", 1.625, 1.641), loose: fitHole("1-47/64", 1.734, 1.759) }
  ];

  function metricRow(size, fine, medium, coarse, tap) {
    return {
      key: "M" + size,
      nominal: size,
      unit: "mm",
      tap: tap || null,
      close: mmHole(fine),
      normal: mmHole(medium),
      loose: mmHole(coarse)
    };
  }
  /* Rows confirmed by at least two published reproductions of ISO 273
     (and, where listed, ASME B18.2.8 Table 3). No interpolated sizes. */
  var CLEAR_MM = [
    metricRow(1.6, 1.7, 1.8, 2),
    metricRow(2, 2.2, 2.4, 2.6),
    metricRow(2.5, 2.7, 2.9, 3.1),
    metricRow(3, 3.2, 3.4, 3.6, "M3×0.5"),
    metricRow(4, 4.3, 4.5, 4.8, "M4×0.7"),
    metricRow(5, 5.3, 5.5, 5.8, "M5×0.8"),
    metricRow(6, 6.4, 6.6, 7, "M6×1"),
    metricRow(8, 8.4, 9, 10, "M8×1.25"),
    metricRow(10, 10.5, 11, 12, "M10×1.5"),
    metricRow(12, 13, 13.5, 14.5, "M12×1.75"),
    metricRow(14, 15, 15.5, 16.5, "M14×2"),
    metricRow(16, 17, 17.5, 18.5, "M16×2"),
    metricRow(18, 19, 20, 21),
    metricRow(20, 21, 22, 24, "M20×2.5"),
    metricRow(22, 23, 24, 26),
    metricRow(24, 25, 26, 28, "M24×3"),
    metricRow(27, 28, 30, 32),
    metricRow(30, 31, 33, 35),
    metricRow(33, 34, 36, 38),
    metricRow(36, 37, 39, 42),
    metricRow(42, 43, 45, 48),
    metricRow(48, 50, 52, 56),
    metricRow(56, 58, 62, 66),
    metricRow(64, 66, 70, 74)
  ];

  var TPI = {
    "4.5": true, "6": true, "7": true, "8": true, "9": true, "10": true,
    "11": true, "12": true, "13": true, "14": true, "16": true, "18": true,
    "20": true, "24": true, "28": true, "32": true, "36": true, "40": true,
    "44": true, "48": true, "56": true, "64": true, "72": true, "80": true,
    "11.5": true, "19": true, "27": true
  };

  function normToken(raw) {
    return String(raw || "").trim().replace(/\s+/g, "").replace(/×/g, "x").replace(/″|"/g, "");
  }
  function isPipeFamily(family) {
    return PIPE_FAMILIES.indexOf(String(family || "").toUpperCase()) >= 0;
  }
  function isPipeKey(token) {
    if (!token) return false;
    if (PIPE_KEYS[token]) return true;
    if (/NPT|BSP|NPS/i.test(token)) return true;
    if (/^G\d/i.test(token)) return true;
    return false;
  }
  function fitName(fit) {
    var f = String(fit || "normal").toLowerCase();
    if (f === "close" || f === "fine" || f === "serre" || f === "serré") return "close";
    if (f === "loose" || f === "coarse" || f === "libre") return "loose";
    return "normal";
  }
  function stripTpi(token) {
    var m = token.match(/^(.*)-(\d+(?:\.\d+)?)$/);
    if (!m || !TPI[m[2]]) return token;
    return m[1];
  }
  function findRow(table, token) {
    var i, row, bare;
    for (i = 0; i < table.length; i++) {
      if (table[i].key === token) return table[i];
    }
    bare = stripTpi(token);
    if (bare !== token) {
      for (i = 0; i < table.length; i++) {
        if (table[i].key === bare) return table[i];
      }
    }
    return null;
  }

  function lookupClearance(family, key, fit) {
    var fam = String(family || "").toUpperCase();
    var token = normToken(key);
    var metric, row, chosen, name;
    if (isPipeFamily(fam) || isPipeKey(token)) return null;
    if (fam === "MM" || fam === "MET" || fam === "METRIC") metric = true;
    else if (fam === "IN" || fam === "INCH" || fam === "UNC" || fam === "UNF" || fam === "SAE") metric = false;
    else if (/^M\d/i.test(token)) metric = true;
    else return null;
    if (/^M/i.test(token)) {
      var mm = token.match(/^M(\d+(?:\.\d+)?)/i);
      token = mm ? "M" + mm[1] : token;
    }
    row = findRow(metric ? CLEAR_MM : CLEAR_IN, token);
    if (!row) return null;
    name = fitName(fit);
    chosen = row[name];
    return {
      family: metric ? "MM" : "IN",
      key: row.key,
      nominal: row.nominal,
      unit: metric ? "mm" : "in",
      fit: name,
      drill: chosen.drill,
      min: chosen.min,
      max: chosen.max,
      unc: row.unc || null,
      unf: row.unf || null,
      tap: row.tap || null,
      close: row.close,
      normal: row.normal,
      loose: row.loose,
      source: metric ? SOURCES.metric : SOURCES.inch
    };
  }

  /* Existing shop formula for the hole drilled BEFORE tapping. Not for clearance. */
  function tapDrillDiameter(major, pitch, pct) {
    return major - TAP_CONSTANT * pitch * ((+pct || 75) / 100);
  }

  return {
    CLEAR_IN: CLEAR_IN,
    CLEAR_MM: CLEAR_MM,
    PIPE_FAMILIES: PIPE_FAMILIES,
    PIPE_KEYS: PIPE_KEYS,
    INCH_NOT_LISTED: INCH_NOT_LISTED,
    SOURCES: SOURCES,
    lookupClearance: lookupClearance,
    tapDrillDiameter: tapDrillDiameter,
    isPipeFamily: isPipeFamily,
    isPipeKey: isPipeKey
  };
});
