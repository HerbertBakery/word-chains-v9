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

/** Hard filter: no words containing digits */
const noDigits = (w: string) => !/\d/.test(w);

/**
 * Deterministic 3 hidden words per Toronto day:
 * - Seed = "hidden-" + Toronto ISO date
 * - Rotates across category pools if available
 * - Filters out any words containing digits (7Up, etc.)
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

  // Pre-filter: keep only words without digits and with friendly length 4..12
  const prep = (list: string[]) =>
    list.filter(noDigits).filter((w) => w.length >= 4 && w.length <= 12);

  const pools: Array<{ cat: string; words: string[] }> = [
    { cat: "animal", words: prep(animals) },
    { cat: "country", words: prep(countries) },
    { cat: "name",   words: prep(names) },
    { cat: "food",   words: prep(foods) },
    { cat: "brand",  words: prep(brands) },
    { cat: "screen", words: prep(screen) },
  ].filter((p) => p.words.length > 0);

  const chosen: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const pool = pools[i % pools.length];
    if (!pool) break;
    let candidate = pool.words[Math.floor(rng() * pool.words.length)];
    let guard = 0;
    while ((used.has(candidate.toLowerCase()) || !noDigits(candidate)) && guard++ < 25) {
      candidate = pool.words[Math.floor(rng() * pool.words.length)];
    }
    used.add(candidate.toLowerCase());
    chosen.push(candidate);
  }

  return { dateKey, words: chosen };
}
