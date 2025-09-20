// lib/seed.ts
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** Map any seed to a deterministic a–z letter */
export function letterFromSeed(seed: string): string {
  const idx = fnv1a(seed) % 26;
  return "abcdefghijklmnopqrstuvwxyz".charAt(idx);
}

/** Generate a short, shareable seed (lowercase base36) */
export function newSeed(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

/** Deterministic PRNG from a seed (Mulberry32 seeded with fnv1a hash) */
export function prngFromSeed(seed: string) {
  let t = fnv1a(String(seed || "wordchains"));
  return function rand() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
