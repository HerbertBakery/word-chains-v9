#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

// ------------ helpers (mirror your game’s normalizers) ------------
const stripDiacritics = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s) =>
  stripDiacritics(String(s))
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[\s'\-&.]/g, "");
const singularize = (w) => {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
};
const stripCorpSuffixes = (s) =>
  s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();

const ROOT = process.cwd();

// Input locations
const BASE = {
  screen: "public/wordchains/screen.json",
  brand: "public/wordchains/brands.json",
  food: "public/wordchains/foods.json",
  name: "public/wordchains/names.json",
};

const TOP = {
  screen: "public/toplists/screen_top1000.json",
  brand: "public/toplists/brand_top250.json",
  food: "public/toplists/food_top250.json",
  name: "public/toplists/name_top1000.json",
};

const ALIASES_FILE = "public/wordchains/aliases.json";

// Output locations
const OUT_DIR = "public/toplists/_reports";

// ------------ load JSON helper ------------
async function loadArray(fp) {
  const full = path.resolve(ROOT, fp);
  const txt = await fs.readFile(full, "utf8");
  const j = JSON.parse(txt);
  return (Array.isArray(j) ? j : []).map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
}
async function loadAliases() {
  try {
    const full = path.resolve(ROOT, ALIASES_FILE);
    const txt = await fs.readFile(full, "utf8");
    const j = JSON.parse(txt);
    return {
      screen: j.screen || {},
      brand: j.brand || {},
      food: j.food || {},
      name: j.name || {},
    };
  } catch {
    return { screen: {}, brand: {}, food: {}, name: {} };
  }
}

// ------------ build normalized lookup sets ------------
function buildBaseSet(cat, arr) {
  if (cat === "brand") {
    // brands: allow multiple normalized forms
    const set = new Set();
    for (const s of arr) {
      const a = String(s).trim();
      set.add(norm(a)); // raw norm
      set.add(norm(stripCorpSuffixes(a))); // corp-stripped norm
    }
    return set;
  }
  if (cat === "food") {
    const set = new Set();
    for (const s of arr) {
      const a = String(s).trim();
      set.add(norm(a));
      set.add(norm(singularize(a)));
    }
    return set;
  }
  // screen & name: plain norm
  return new Set(arr.map((x) => norm(String(x).trim())));
}

function applyAlias(cat, item, aliases) {
  const key = norm(String(item));
  const table = aliases[cat] || {};
  for (const [raw, mapped] of Object.entries(table)) {
    if (norm(raw) === key) return String(mapped);
  }
  return item;
}

function canonicalForms(cat, item) {
  const out = new Set();
  const raw = String(item).trim();

  if (cat === "brand") {
    out.add(norm(raw));
    out.add(norm(stripCorpSuffixes(raw)));
    out.add(norm(raw.replace(/&/g, "and")));
    out.add(norm(stripCorpSuffixes(raw.replace(/&/g, "and"))));
    return out;
  }

  if (cat === "food") {
    const a = norm(raw);
    out.add(a);
    out.add(norm(singularize(raw)));
    out.add(a.replace(/&/g, "and"));
    return out;
  }

  if (cat === "screen") {
    // Remove year, leading "the ", handle & ↔ and, collapse punctuation
    const noYear = raw.replace(/\(\d{4}\)/g, "").trim();
    const noThe = noYear.replace(/^\s*the\s+/i, "").trim();
    const ampAnd = [noThe, noThe.replace(/&/g, "and")];
    for (const v of ampAnd) {
      out.add(norm(v));
      // drop subtitles after colon if needed
      out.add(norm(v.split(":")[0]));
    }
    return out;
  }

  if (cat === "name") {
    out.add(norm(raw));
    // also support “Alex (Alexander)” style
    out.add(norm(raw.replace(/\(.*?\)/g, "").trim()));
    return out;
  }

  out.add(norm(raw));
  return out;
}

// ------------ main ------------
(async () => {
  await fs.mkdir(path.resolve(ROOT, OUT_DIR), { recursive: true });

  const aliases = await loadAliases();

  const cats = /** @type {Array<"screen"|"brand"|"food"|"name">} */ (["screen", "brand", "food", "name"]);
  const report = {};

  for (const cat of cats) {
    const baseArr = await loadArray(BASE[cat]);
    const topArr = await loadArray(TOP[cat]);

    const baseSet = buildBaseSet(cat, baseArr);

    const missing = [];
    const matches = [];
    const aliasTodos = {};

    for (const item of topArr) {
      const aliased = applyAlias(cat, item, aliases);
      const forms = canonicalForms(cat, aliased);

      let ok = false;
      for (const f of forms) {
        if (baseSet.has(f)) {
          ok = true;
          break;
        }
      }
      if (ok) {
        matches.push(item);
      } else {
        missing.push(item);
        aliasTodos[item] = "";
      }
    }

    report[cat] = {
      baseTotal: baseArr.length,
      topTotal: topArr.length,
      covered: matches.length,
      missing: missing.length,
      coveragePct: Math.round((matches.length / Math.max(1, topArr.length)) * 100),
    };

    // write files
    await fs.writeFile(
      path.resolve(ROOT, `${OUT_DIR}/missing-${cat}.json`),
      JSON.stringify(missing, null, 2),
      "utf8"
    );
    // alias TODOs (only for missing)
    await fs.writeFile(
      path.resolve(ROOT, `${OUT_DIR}/aliases.todo.${cat}.json`),
      JSON.stringify(aliasTodos, null, 2),
      "utf8"
    );

    // if you want to *add* missing into base (optional), create a suggested additions file
    await fs.writeFile(
      path.resolve(ROOT, `${OUT_DIR}/suggested-additions-${cat}.json`),
      JSON.stringify(missing, null, 2),
      "utf8"
    );
  }

  await fs.writeFile(
    path.resolve(ROOT, `${OUT_DIR}/summary.json`),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  // pretty console output
  console.log("=== Toplist Coverage ===");
  for (const [cat, stats] of Object.entries(report)) {
    console.log(
      `${cat.padEnd(6)}: ${String(stats.covered).padStart(4)}/${String(stats.topTotal).padEnd(4)} (${stats.coveragePct}%)`
    );
  }
  console.log(`\nMissing items and alias TODO files are in: ${OUT_DIR}/`);
})();
