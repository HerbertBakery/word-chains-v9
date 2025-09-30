// lib/chaindex.ts

export type DexCat = "animal" | "country" | "screen" | "brand" | "food" | "name";
const COINS_PER_CLAIM = 5;

// ---- LocalStorage keys (unchanged names for back-compat)
const LS_DISCOVERED = {
  animal: "wc_dex_discovered_animal",
  country: "wc_dex_discovered_country",
  screen: "wc_dex_discovered_screen_top250",
  brand: "wc_dex_discovered_brand_top250",
  food: "wc_dex_discovered_food_top250",
  name: "wc_dex_discovered_name_top1000",
} as const;

const LS_CLAIMED = {
  animal: "wc_dex_animal",
  country: "wc_dex_country",
  screen: "wc_dex_screen_top250",
  brand: "wc_dex_brand_top250",
  food: "wc_dex_food_top250",
  name: "wc_dex_name_top1000",
} as const;

// ---- Normalization (shared with server routes)
function stripDiacritics(s: string) {
  try { return s.normalize("NFD").replace(/\p{Diacritic}/gu, ""); } catch { return s; }
}
function normKey(s: string) { return stripDiacritics(String(s)).toLowerCase().trim(); }
function singularize(w: string) {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es"))  return w.slice(0, -2);
  if (w.endsWith("s"))   return w.slice(0, -1);
  return w;
}
function stripCorpSuffixes(s: string) {
  return s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();
}
function canonicalKey(category: DexCat, word: string) {
  const k = normKey(word);
  switch (category) {
    case "animal":
    case "food":   return singularize(k);           // plural → singular
    case "brand":  return normKey(stripCorpSuffixes(word)); // drop “Inc”, “Ltd”, etc.
    case "country":
    case "screen":
    case "name":
    default:       return k;
  }
}

// ---- LS helpers
function getLsArray(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function setLsArray(key: string, arr: string[]) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(new Set(arr)))); } catch {}
}

// ---- Optional server calls
async function tryServer(route: string, payload: any) {
  try {
    const r = await fetch(route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return r.ok ? await r.json().catch(() => ({})) : null;
  } catch {
    return null;
  }
}

export async function recordDiscovery(opts: { word: string; categories: Set<DexCat> }) {
  const { word, categories } = opts;
  for (const cat of categories) {
    const w = canonicalKey(cat, word);
    if (!w) continue;
    const key = LS_DISCOVERED[cat];
    const discovered = getLsArray(key);
    if (!discovered.includes(w)) {
      discovered.push(w);
      setLsArray(key, discovered);
      // server mirror (safe if missing)
      await tryServer("/api/chaindex/discover", { category: cat, key: w });
    }
  }
}

export async function claimDexEntry(opts: { category: DexCat; word: string }) {
  const { category, word } = opts;
  const w = canonicalKey(category, word);
  if (!w) return;

  const discoveredKey = LS_DISCOVERED[category];
  const claimedKey = LS_CLAIMED[category];

  // move local
  const discovered = getLsArray(discoveredKey).filter(x => x !== w);
  const claimed = getLsArray(claimedKey);
  if (!claimed.includes(w)) claimed.push(w);
  setLsArray(discoveredKey, discovered);
  setLsArray(claimedKey, claimed);

  // server unlock
  await tryServer("/api/chaindex/unlock", { category, key: w });

  // server coins
  await tryServer("/api/wordcoins/grant", {
    amount: COINS_PER_CLAIM,
    reason: { kind: "dex_claim", category, key: w },
  });

  // ping badge to refetch from server
  try {
    window.dispatchEvent(new CustomEvent("wc:wordcoins:delta", { detail: { delta: COINS_PER_CLAIM } }));
  } catch {}
}
