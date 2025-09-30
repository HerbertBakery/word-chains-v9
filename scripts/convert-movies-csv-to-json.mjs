#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

async function convert() {
  const csvUrl = "https://raw.githubusercontent.com/JaviRute/top_1000_movies-data_science_project/refs/heads/main/imdb_top_1000.csv";  
  // You could also download locally and read a local file

  // If reading local:
  // const csvText = await fs.readFile(path.resolve("data/imdb_top_1000.csv"), "utf8");

  // Or fetch remote (requires node-fetch):
  const fetch = (await import("node-fetch")).default;
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  const csvText = await res.text();

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  // Extract titles
  const titles = records.map((r) => r["Series_Title"]).filter(Boolean);

  const outPath = path.resolve("public/toplists/screen_top1000.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(titles, null, 2), "utf8");

  console.log(`Wrote ${titles.length} titles to ${outPath}`);
}

convert().catch((e) => {
  console.error("Error converting:", e);
  process.exit(1);
});
