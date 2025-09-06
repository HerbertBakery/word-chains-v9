const fs = require("fs");

const existingPath = "public/wordchains/brands.json";
const extraPath = "extra-brands.json";

if (!fs.existsSync(existingPath)) {
  console.error(`Missing ${existingPath}`);
  process.exit(1);
}
if (!fs.existsSync(extraPath)) {
  console.error(`Missing ${extraPath}`);
  process.exit(1);
}

const existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
const extra = JSON.parse(fs.readFileSync(extraPath, "utf-8"));

// normalize to lowercase & trim for dedupe
const norm = (s) => String(s).toLowerCase().trim();

// merge + dedupe + sort
const merged = Array.from(new Set([...existing, ...extra].map(norm))).sort();

// write back out
fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
console.log(`Merged ${existing.length} existing + ${extra.length} extra → ${merged.length} total brands`);

