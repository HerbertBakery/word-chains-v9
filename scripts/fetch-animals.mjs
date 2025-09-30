#!/usr/bin/env node
// scripts/fetch-animals.mjs
// Fetch per-animal SVG icons into public/icons/animals/<slug>.svg
// Priority: OpenMoji SVG by name → fallback: generated monogram SVG

import fs from "node:fs/promises";
import path from "node:path";
import fetch from "node-fetch";

// 1) Where to save icons
const OUT_DIR = path.resolve("public/icons/animals");

// 2) Load your list of animal names
const animalsPath = path.resolve("public/wordchains/animals.json");
const raw = JSON.parse(await fs.readFile(animalsPath, "utf8"));
const animals = (Array.isArray(raw) ? raw : Object.values(raw).flat())
  .map((x) => (typeof x === "string" ? x : x?.name))
  .filter(Boolean);

// 3) Helpers
const slugify = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const openmojiBase = "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg";

// A small table of likely OpenMoji filenames for common animals
// (OpenMoji files are named by codepoint hex, not by English name;
// we’ll do a simple name→filename guess list for frequent ones).
// You can expand this list over time; the script will fallback if missing.
const COMMON_MAP = {
  "dog": "1f415.svg",
  "dog-face": "1f436.svg",
  "wolf": "1f43a.svg",
  "fox": "1f98a.svg",
  "cat": "1f431.svg",
  "lion": "1f981.svg",
  "tiger": "1f405.svg",
  "leopard": "1f406.svg",
  "horse": "1f40e.svg",
  "zebra": "1f993.svg",
  "cow": "1f404.svg",
  "ox": "1f402.svg",
  "bison": "1f9ac.svg",
  "pig": "1f416.svg",
  "boar": "1f417.svg",
  "hippopotamus": "1f99b.svg",
  "rhinoceros": "1f98f.svg",
  "elephant": "1f418.svg",
  "camel": "1f42a.svg",
  "two-humped-camel": "1f42b.svg",
  "llama": "1f999.svg",
  "alpaca": "1f999.svg",
  "giraffe": "1f992.svg",
  "goat": "1f410.svg",
  "sheep": "1f411.svg",
  "ram": "1f40f.svg",
  "deer": "1f98c.svg",
  "moose": "1face.svg",
  "bear": "1f43b.svg",
  "polar-bear": "1f43b-200d-2744-fe0f.svg",
  "panda": "1f43c.svg",
  "koala": "1f428.svg",
  "bat": "1f987.svg",
  "monkey": "1f412.svg",
  "gorilla": "1f98d.svg",
  "orangutan": "1f9a7.svg",
  "rabbit": "1f407.svg",
  "skunk": "1f9a8.svg",
  "badger": "1f9a1.svg",
  "hedgehog": "1f994.svg",
  "otter": "1f9a6.svg",
  "beaver": "1f9ab.svg",
  "squirrel": "1f43f.svg",
  "kangaroo": "1f998.svg",
  "raccoon": "1f99d.svg",
  "owl": "1f989.svg",
  "eagle": "1f985.svg",
  "duck": "1f986.svg",
  "swan": "1f9a2.svg",
  "peacock": "1f99a.svg",
  "parrot": "1f99c.svg",
  "flamingo": "1f9a9.svg",
  "penguin": "1f427.svg",
  "crocodile": "1f40a.svg",
  "lizard": "1f98e.svg",
  "snake": "1f40d.svg",
  "turtle": "1f422.svg",
  "frog": "1f438.svg",
  "fish": "1f41f.svg",
  "tropical-fish": "1f420.svg",
  "blowfish": "1f421.svg",
  "shark": "1f988.svg",
  "whale": "1f40b.svg",
  "dolphin": "1f42c.svg",
  "seal": "1f9ad.svg",
  "octopus": "1f419.svg",
  "squid": "1f991.svg",
  "lobster": "1f99e.svg",
  "crab": "1f980.svg",
  "shrimp": "1f990.svg",
  "butterfly": "1f98b.svg",
  "bug": "1f41b.svg",
  "ant": "1f41c.svg",
  "honeybee": "1f41d.svg",
  "beetle": "1fab2.svg",
  "lady-beetle": "1f41e.svg",
  "spider": "1f577.svg",
  "scorpion": "1f982.svg",
  "snail": "1f40c.svg"
};

await fs.mkdir(OUT_DIR, { recursive: true });

const seen = new Set();

for (const name of animals) {
  const slug = slugify(String(name));
  if (seen.has(slug)) continue;
  seen.add(slug);

  const outFile = path.join(OUT_DIR, `${slug}.svg`);

  // skip if exists
  try {
    await fs.access(outFile);
    continue;
  } catch {}

  // Try OpenMoji (by our simple common map & common variants)
  const candidates = candidateOpenmojiFiles(slug);
  let saved = false;
  for (const file of candidates) {
    const url = `${openmojiBase}/${file}`;
    try {
      const r = await fetch(url);
      if (r.ok) {
        const svg = await r.text();
        await fs.writeFile(outFile, svg, "utf8");
        saved = true;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!saved) {
    // Fallback: generate monogram SVG
    const svg = makeMonogramSVG(name);
    await fs.writeFile(outFile, svg, "utf8");
  }
}

console.log(`✓ Animal icons prepared in ${OUT_DIR}`);

function candidateOpenmojiFiles(slug) {
  const list = [];
  // exact from common map
  if (COMMON_MAP[slug]) list.push(COMMON_MAP[slug]);

  // try some common aliasing
  const aliases = new Set([slug]);

  // singular/plural trimming
  if (slug.endsWith("ies")) aliases.add(slug.slice(0, -3) + "y");
  if (slug.endsWith("es")) aliases.add(slug.slice(0, -2));
  if (slug.endsWith("s")) aliases.add(slug.slice(0, -1));

  // spaces to hyphens already done; try removing qualifiers like “-animal”
  for (const a of [...aliases]) {
    aliases.add(a.replace(/-animal$/, ""));
    aliases.add(a.replace(/-bear$/, "bear")); // polar-bear, etc.
  }

  for (const a of aliases) {
    if (COMMON_MAP[a]) list.push(COMMON_MAP[a]);
  }

  // de-dup
  return [...new Set(list)];
}

function makeMonogramSVG(name) {
  const letters = slugify(name).replace(/[^a-z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = Math.abs(hash(name)) % 360;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="0" y="0" width="64" height="64" rx="14" fill="hsl(${hue} 70% 45%)"/>
  <text x="50%" y="54%" text-anchor="middle" font-size="28" font-weight="700" fill="#fff"
    font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial">${letters}</text>
</svg>`.trim();
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}
