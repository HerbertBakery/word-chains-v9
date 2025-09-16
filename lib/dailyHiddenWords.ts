// lib/dailyHiddenWords.ts

/** Toronto-local ISO date (YYYY-MM-DD) */
function torontoISODate(d = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value ?? "2000";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Tiny seeded PRNG (xmur3 hash + mulberry32) — no external deps */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngFromSeed(seedStr: string) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

// Load word lists from your public JSONs
async function loadWords(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const j = await res.json();
    const arr = Array.isArray(j) ? j : [];
    return arr
      .map((x: any) => (typeof x === "string" ? x : x?.name))
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

/**
 * Deterministic 3 hidden words per Toronto day:
 * - Seed = "hidden-" + Toronto ISO date
 * - Rotates across category pools if available
 */
export async function generateDailyHiddenWords(date = new Date()) {
  const dateKey = torontoISODate(date);
  const rng = rngFromSeed("hidden-" + dateKey);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [animals, countries, names, foods, brands, screen] = await Promise.all([
    loadWords(`${base}/wordchains/animals.json`),
    loadWords(`${base}/wordchains/countries.json`),
    loadWords(`${base}/wordchains/names.json`),
    loadWords(`${base}/wordchains/foods.json`),
    loadWords(`${base}/wordchains/brands.json`),
    loadWords(`${base}/wordchains/screen.json`),
  ]);

  const pools: Array<{ cat: string; words: string[] }> = [
    { cat: "animal", words: animals },
    { cat: "country", words: countries },
    { cat: "name", words: names },
    { cat: "food", words: foods },
    { cat: "brand", words: brands },
    { cat: "screen", words: screen },
  ].filter((p) => p.words.length > 0);

  const chosen: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const pool = pools[i % pools.length];
    if (!pool) break;
    let candidate = pool.words[Math.floor(rng() * pool.words.length)];
    let guard = 0;
    while (used.has(candidate.toLowerCase()) && guard++ < 25) {
      candidate = pool.words[Math.floor(rng() * pool.words.length)];
    }
    used.add(candidate.toLowerCase());
    chosen.push(candidate);
  }

  return { dateKey, words: chosen };
}
