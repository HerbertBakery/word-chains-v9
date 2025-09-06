// Create animals.json from a plain text file where each line is a common animal name.
// Put your file at data/animals.txt (one name per line, any case).
// We'll normalize to lowercase, dedupe, and save JSON.
import fs from "node:fs/promises";
const src = "data/animals.txt";
const txt = await fs.readFile(src, "utf8").catch(() => null);
if (!txt) {
  console.error("Missing data/animals.txt. Create it (one animal per line).");
  process.exit(1);
}
const items = Array.from(new Set(txt.split(/\r?\n/).map(x => x.trim().toLowerCase()).filter(Boolean))).sort();
await fs.mkdir("public/wordchains", { recursive: true });
await fs.writeFile("public/wordchains/animals.json", JSON.stringify(items, null, 2), "utf8");
console.log(`Wrote ${items.length} animals to public/wordchains/animals.json`);
