#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

function toTitleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/(^|\s|[-'’])/g, (m) => m.toUpperCase());
}

// Try to pick a “name” field from a row using common headers
function extractNameField(row) {
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  const map = Object.fromEntries(keys.map((k, i) => [k, Object.keys(row)[i]]));

  const candidates = [
    "name",             // generic
    "names",            // sometimes plural
    "child's first name",
    "childs first name",
    "first name",
  ];

  for (const k of candidates) {
    if (map[k]) return row[map[k]];
  }

  // Fallback: SSA-like formats sometimes have first column as name
  const firstKey = Object.keys(row)[0];
  return row[firstKey];
}

// If rank exists, use it; else we keep input order
function extractRank(row) {
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  const map = Object.fromEntries(keys.map((k, i) => [k, Object.keys(row)[i]]));
  const rankKeys = ["rank", "position", "rnk", "order"];
  for (const k of rankKeys) {
    if (map[k] && row[map[k]] !== undefined && row[map[k]] !== null && row[map[k]] !== "") {
      const n = Number(String(row[map[k]]).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

// (Optional) detect gender to interleave boys/girls if present
function extractGender(row) {
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  const map = Object.fromEntries(keys.map((k, i) => [k, Object.keys(row)[i]]));
  const gk = ["gender", "sex"];
  for (const k of gk) {
    if (map[k]) {
      const v = String(row[map[k]]).toUpperCase();
      if (v === "M" || v === "F" || v === "BOY" || v === "GIRL") return v;
    }
  }
  return null;
}

async function readCsvEither({ source }) {
  // source can be a URL or a local file path
  const isUrl = /^https?:\/\//i.test(source);
  let csvText = "";
  if (isUrl) {
    const fetch = (await import("node-fetch")).default;
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
    csvText = await res.text();
  } else {
    csvText = await fs.readFile(path.resolve(source), "utf8");
  }
  return parse(csvText, { columns: true, skip_empty_lines: true });
}

function uniqueTopNFromRows(rows, N = 1000) {
  // If dataset has both genders, interleave by rank; else keep rank/order
  const withMeta = rows.map((r, i) => {
    const nameRaw = extractNameField(r);
    const name = toTitleCase(nameRaw);
    const gender = extractGender(r); // might be null
    const rank = extractRank(r) ?? (i + 1);
    return { name, gender, rank, _idx: i };
  });

  // Separate by gender if present; otherwise single list
  const boys = withMeta.filter((x) => x.gender && /^(M|BOY)$/i.test(x.gender)).sort((a, b) => a.rank - b.rank);
  const girls = withMeta.filter((x) => x.gender && /^(F|GIRL)$/i.test(x.gender)).sort((a, b) => a.rank - b.rank);
  const mixed = (!boys.length && !girls.length) ? withMeta.sort((a, b) => a.rank - b.rank) : null;

  const out = [];
  const seen = new Set();

  if (mixed) {
    for (const x of mixed) {
      if (!x.name) continue;
      const key = x.name.toLowerCase();
      if (seen.has(key)) continue;
      out.push(x.name);
      seen.add(key);
      if (out.length >= N) break;
    }
    return out;
  }

  // Interleave boys/girls: 1,1, 2,2, 3,3, …
  const maxLen = Math.max(boys.length, girls.length);
  for (let i = 0; i < maxLen && out.length < N; i++) {
    if (boys[i]) {
      const key = boys[i].name.toLowerCase();
      if (!seen.has(key)) {
        out.push(boys[i].name);
        seen.add(key);
      }
    }
    if (out.length >= N) break;
    if (girls[i]) {
      const key = girls[i].name.toLowerCase();
      if (!seen.has(key)) {
        out.push(girls[i].name);
        seen.add(key);
      }
    }
  }
  return out.slice(0, N);
}

async function main() {
  // Usage:
  // node scripts/convert-names-csv-to-json.mjs --source <URL-or-filepath> [--out public/toplists/name_top1000.json]
  const args = process.argv.slice(2);
  const getArg = (flag, def = null) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : def;
  };

  const source =
    getArg("--source") ||
    // If you already downloaded a CSV locally, set the default path here:
    // e.g. "data/names_2024.csv"
    null;

  if (!source) {
    console.error("Usage: node scripts/convert-names-csv-to-json.mjs --source <URL-or-filepath>");
    process.exit(1);
  }

  const outPath =
    getArg("--out") || path.resolve("public/toplists/name_top1000.json");

  const rows = await readCsvEither({ source });
  const names = uniqueTopNFromRows(rows, 1000);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(names, null, 2), "utf8");

  console.log(`Wrote ${names.length} names → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
