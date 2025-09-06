import fs from "node:fs/promises";
const res = await fetch("https://restcountries.com/v3.1/all");
if (!res.ok) throw new Error(`REST Countries failed: ${res.status}`);
const data = await res.json();
const names = Array.from(new Set(data.map(c => (c.name?.common || "").toString().trim().toLowerCase()).filter(Boolean))).sort();
await fs.mkdir("public/wordchains", { recursive: true });
await fs.writeFile("public/wordchains/countries.json", JSON.stringify(names, null, 2), "utf8");
console.log(`Wrote ${names.length} countries to public/wordchains/countries.json`);
