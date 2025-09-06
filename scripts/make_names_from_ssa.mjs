// Build names.json from SSA "names.zip" (download manually from SSA) or Kaggle export.
// Place all yob*.txt files into data/ssa/ (format: Name,Sex,Count).
// We'll collect unique given names and write to public/wordchains/names.json.
import fs from "node:fs/promises";
import path from "node:path";
const dir = "data/ssa";
const files = await fs.readdir(dir).catch(() => []);
if (!files.length) {
  console.error("No files found in data/ssa. Put SSA yob*.txt files there.");
  process.exit(1);
}
const names = new Set();
for (const f of files) {
  if (!/^yob\d+\.txt$/.test(f)) continue;
  const txt = await fs.readFile(path.join(dir, f), "utf8");
  for (const line of txt.split(/\r?\n/)) {
    if (!line) continue;
    const [name] = line.split(",");
    if (!name) continue;
    const n = name.trim().toLowerCase();
    if (/^[a-z][a-z\-']{1,}$/i.test(n)) names.add(n);
  }
}
const arr = Array.from(names).sort();
await fs.mkdir("public/wordchains", { recursive: true });
await fs.writeFile("public/wordchains/names.json", JSON.stringify(arr, null, 2), "utf8");
console.log(`Wrote ${arr.length} names to public/wordchains/names.json`);
