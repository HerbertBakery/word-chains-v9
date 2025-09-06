// Pull a large English word list (SCOWL via en-wl GitHub mirror).
// License: see https://github.com/en-wl/wordlist . Use responsibly for game validation.
import fs from "node:fs/promises";
const url = "https://raw.githubusercontent.com/en-wl/wordlist/master/words_alpha.txt";
const res = await fetch(url);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const txt = await res.text();
const words = Array.from(new Set(txt.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w)))).sort();
await fs.mkdir("public/wordchains", { recursive: true });
await fs.writeFile("public/wordchains/dictionary.json", JSON.stringify(words, null, 2), "utf8");
console.log(`Wrote ${words.length} words to public/wordchains/dictionary.json`);
