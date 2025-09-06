import fs from "fs";

const existing = JSON.parse(fs.readFileSync("public/wordchains/foods.json", "utf-8"));
const extra = JSON.parse(fs.readFileSync("extra-foods.json", "utf-8")); 
// ^ save my provided foods.json as extra-foods.json in your project root

// normalize to lowercase & trim
const norm = s => s.toLowerCase().trim();

// merge + deduplicate
const merged = Array.from(new Set([...existing, ...extra].map(norm))).sort();

// write back out
fs.writeFileSync("public/wordchains/foods.json", JSON.stringify(merged, null, 2));

console.log(`Merged ${existing.length} existing + ${extra.length} extra → ${merged.length} total foods`);
