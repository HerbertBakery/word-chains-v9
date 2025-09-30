// app/chaindex/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { claimDexEntry } from "@/lib/chaindex";
import DexAnimalIcon from "@/app/components/DexAnimalIcon";
import Flag from "@/app/components/Flag";

/** ---------- Categories / Tabs ---------- */
type Tab =
  | "animal"
  | "country"
  | "screen_top250"
  | "brand_top250"
  | "food_top250"
  | "name_top1000";

const TABS: Tab[] = [
  "animal",
  "country",
  "screen_top250",
  "brand_top250",
  "food_top250",
  "name_top1000",
];

const LABEL: Record<Tab, string> = {
  animal: "Animals",
  country: "Countries",
  screen_top250: "Top Movies/Tv",
  brand_top250: "Top Brands",
  food_top250: "Top Food",
  name_top1000: "Popular Names",
};

// ORIGINAL sources for animals & countries (unchanged)
const DATA_URL = {
  animal: "/wordchains/animals.json",
  country: "/wordchains/countries.json",
} as const;

// LIMITS for toplists (slice after loading)
const LIMIT: Partial<Record<Tab, number>> = {
  screen_top250: 1000, // show all 1000 movies
  brand_top250: 250,
  food_top250: 250,
  name_top1000: 1000, // show all 1000 names
};

/** ---------- toplist loader (files are in /public/toplists) ---------- */
type TopCat = "screen" | "brand" | "food" | "name";

/**
 * Use ONLY the filenames you actually have to stop 404 spam.
 * (You can add more variants later if you add more files.)
 */
function candidatesFor(cat: TopCat): string[] {
  if (cat === "name") {
    return ["/toplists/names_top_1000.json"];
  }
  if (cat === "screen") {
    return ["/toplists/screen_top_1000.json"];
  }
  if (cat === "brand") {
    return [
      "/toplists/brands_top_1000.json",
      "/toplists/brand_top_1000.json",
      "/toplists/brands_top.json",
      "/toplists/brand_top.json",
      "/toplists/brands.json",
      "/toplists/brand.json",
    ];
  }
  // food
  return [
    "/toplists/foods_top_1000.json",
    "/toplists/food_top_1000.json",
    "/toplists/foods_top.json",
    "/toplists/food_top.json",
    "/toplists/foods.json",
    "/toplists/food.json",
  ];
}

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function normKey(s: string) {
  return stripDiacritics(s).toLowerCase().trim();
}
function slug(s: string) {
  return normKey(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function stripCorpSuffixes(s: string) {
  return s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();
}
function singularize(w: string) {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Map any array (strings or objects) to strings */
function mapItemsToStrings(cat: TopCat, arr: any[]): string[] {
  const pick = (it: any): string | null => {
    if (typeof it === "string") return it;
    if (it && typeof it === "object") {
      // common fields across datasets
      // screen: title | name | label
      // others: name | title | label
      const v =
        (cat === "screen"
          ? it.title ?? it.name ?? it.label
          : it.name ?? it.title ?? it.label) ?? null;
      return typeof v === "string" ? v : null;
    }
    return null;
  };
  return arr.map(pick).filter((s): s is string => !!s).map((s) => s.trim()).filter(Boolean);
}

/** Find an array inside arbitrary JSON */
function pickArrayFromJson(parsed: any, cat: TopCat): string[] | null {
  if (!parsed) return null;
  if (Array.isArray(parsed)) return mapItemsToStrings(cat, parsed);

  const base = cat;
  const plural = cat === "name" ? "names" : cat === "brand" ? "brands" : cat === "food" ? "foods" : "screens";
  const candidates = [base, plural, "list", "items", "data"];

  for (const k of candidates) {
    if (k in parsed && Array.isArray(parsed[k])) return mapItemsToStrings(cat, parsed[k]);
  }
  // Fall back to first array-like field
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v)) return mapItemsToStrings(cat, v);
  }
  return null;
}

async function fetchToplist(cat: TopCat): Promise<string[]> {
  const urls = candidatesFor(cat);
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const arr = pickArrayFromJson(json, cat);
      if (!arr) continue;
      const clean = Array.from(
        new Set(
          arr
            .filter((x) => typeof x === "string")
            .map((x) => x.trim())
            .filter(Boolean)
        )
      );
      if (clean.length) {
        // Helpful one-liner while debugging
        console.log(`[ChainDex] Loaded ${clean.length} for "${cat}" from ${url}`);
        return clean;
      }
    } catch {
      // try next
    }
  }
  console.warn(`[ChainDex] No toplist found for "${cat}". Tried:`, urls);
  return [];
}

/** ---------- VFX ---------- */
function flyCoinsFromRect(from: DOMRect, amount = 5) {
  try {
    const badge = document.getElementById("wordcoins-badge");
    if (!badge) return;
    const to = badge.getBoundingClientRect();
    for (let i = 0; i < Math.min(6, Math.max(1, Math.ceil(amount / 5))); i++) {
      const coin = document.createElement("div");
      coin.textContent = "🪙";
      coin.style.position = "fixed";
      coin.style.left = `${from.left + from.width / 2}px`;
      coin.style.top = `${from.top + from.height / 2}px`;
      coin.style.pointerEvents = "none";
      coin.style.transition = "transform 650ms cubic-bezier(.2,.8,.2,1), opacity 650ms";
      coin.style.transform = "translate(0,0) scale(1)";
      coin.style.opacity = "1";
      coin.style.zIndex = "9999";
      document.body.appendChild(coin);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      requestAnimationFrame(() => {
        coin.style.transform = `translate(${dx}px, ${dy}px) scale(.7)`;
        coin.style.opacity = "0";
      });
      setTimeout(() => coin.remove(), 750);
    }
  } catch {}
}

/** ---------- Icons ---------- */
type DexState = "locked" | "discovered" | "claimed";
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 🎬 Movies/Tv
function ScreenIcon({ title, state, size = 44 }: { title: string; state: DexState; size?: number }) {
  const muted = state !== "claimed";
  const pulse = state === "discovered";
  return (
    <span
      role="img"
      aria-label={title}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      className={[muted ? "opacity-40 grayscale" : "", pulse ? "animate-pulse" : ""].join(" ")}
    >
      🎬
    </span>
  );
}

// 🏷️ Brands
function BrandIcon({ name, state, size = 44 }: { name: string; state: DexState; size?: number }) {
  const key = slug(stripCorpSuffixes(name));
  const letters = key.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = hash(key) % 360;
  const muted = state !== "claimed";
  const pulse = state === "discovered";
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={["rounded-xl", muted ? "opacity-40 grayscale" : "", pulse ? "animate-pulse" : ""].join(" ")}
    >
      <defs>
        <linearGradient id={`b-${key}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 80% 45%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 30) % 360} 80% 40%)`} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`url(#b-${key})`} />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}
      >
        {letters}
      </text>
    </svg>
  );
}

// 🍔 Foods
const FOOD_EMOJI: Record<string, string> = {
  pizza: "🍕",
  burger: "🍔",
  hamburger: "🍔",
  cheeseburger: "🍔",
  sushi: "🍣",
  ramen: "🍜",
  pasta: "🍝",
  taco: "🌮",
  burrito: "🌯",
  salad: "🥗",
  apple: "🍎",
  banana: "🍌",
  fries: "🍟",
  steak: "🥩",
  chicken: "🍗",
  doughnut: "🍩",
  donut: "🍩",
  icecream: "🍨",
  "ice-cream": "🍨",
  chocolate: "🍫",
  cake: "🍰",
  cookie: "🍪",
  bread: "🍞",
  croissant: "🥐",
  coffee: "☕",
  tea: "🍵",
  soup: "🍲",
  hotdog: "🌭",
  sandwich: "🥪",
  pancake: "🥞",
  waffle: "🧇",
};
function FoodIcon({ name, state, size = 44 }: { name: string; state: DexState; size?: number }) {
  const key = slug(name);
  const base = singularize(normKey(name));
  const emoji = FOOD_EMOJI[base] || FOOD_EMOJI[key] || FOOD_EMOJI[base.replace(/-/g, "")];
  const muted = state !== "claimed";
  const pulse = state === "discovered";
  if (emoji) {
    return (
      <span
        role="img"
        aria-label={name}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        className={[muted ? "opacity-40 grayscale" : "", pulse ? "animate-pulse" : ""].join(" ")}
      >
        {emoji}
      </span>
    );
  }
  const letters = base.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = hash(base) % 360;
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={["rounded-xl", muted ? "opacity-40 grayscale" : "", pulse ? "animate-pulse" : ""].join(" ")}
    >
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`hsl(${hue} 75% 45%)`} />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}
      >
        {letters}
      </text>
    </svg>
  );
}

// 🧑 Names
function NameIcon({ name, state, size = 44 }: { name: string; state: DexState; size?: number }) {
  const base = normKey(name);
  const letters = base.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = hash(base) % 360;
  const muted = state !== "claimed";
  const pulse = state === "discovered";
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={["rounded-xl", muted ? "opacity-40 grayscale" : "", pulse ? "animate-pulse" : ""].join(" ")}
    >
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`hsl(${hue} 65% 45%)`} />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}
      >
        {letters}
      </text>
    </svg>
  );
}

/** ---------- Page ---------- */
export default function ChainDexPage() {
  const [active, setActive] = useState<Tab>("animal");

  // raw data
  const [raw, setRaw] = useState<{
    animal: string[];
    country: string[];
    screen: string[];
    brand: string[];
    food: string[];
    name: string[];
  }>({ animal: [], country: [], screen: [], brand: [], food: [], name: [] });

  // rendered lists per tab
  const [data, setData] = useState<Record<Tab, string[]>>({
    animal: [],
    country: [],
    screen_top250: [],
    brand_top250: [],
    food_top250: [],
    name_top1000: [],
  });

  // discovered / claimed (SERVER-DRIVEN)
  const [discovered, setDiscovered] = useState<Record<Tab, Set<string>>>(() => {
    const out = {} as Record<Tab, Set<string>>;
    for (const t of TABS) out[t] = new Set<string>();
    return out;
  });
  const [claimed, setClaimed] = useState<Record<Tab, Set<string>>>(() => {
    const out = {} as Record<Tab, Set<string>>;
    for (const t of TABS) out[t] = new Set<string>();
    return out;
  });

  // Load datasets (JSON) once
  useEffect(() => {
    (async () => {
      const fetchArrayStrings = async (url: string) => {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) return [];
          const j = await r.json();
          if (Array.isArray(j)) {
            // animals/countries are arrays of strings or {name:..}
            return mapItemsToStrings("name", j); // same mapping works for both
          }
          const arrField =
            (Array.isArray(j?.animals) && j.animals) ||
            (Array.isArray(j?.countries) && j.countries) ||
            null;
          return arrField ? mapItemsToStrings("name", arrField) : [];
        } catch {
          return [];
        }
      };

      const [animals, countries] = await Promise.all([
        fetchArrayStrings(DATA_URL.animal),
        fetchArrayStrings(DATA_URL.country),
      ]);

      const [screen, brand, food, name] = await Promise.all([
        fetchToplist("screen"),
        fetchToplist("brand").then((arr) => arr.map(stripCorpSuffixes)),
        fetchToplist("food"),
        fetchToplist("name"),
      ]);

      setRaw({ animal: animals, country: countries, screen, brand, food, name });

      const uniq = (arr: string[]) => Array.from(new Set(arr));
      setData({
        animal: uniq(animals),
        country: uniq(countries),
        screen_top250: uniq(screen).slice(0, LIMIT.screen_top250!),
        brand_top250: uniq(brand).slice(0, LIMIT.brand_top250!),
        food_top250: uniq(food).slice(0, LIMIT.food_top250!),
        name_top1000: uniq(name).slice(0, LIMIT.name_top1000!),
      });
    })();
  }, []);

  // Load progress from SERVER (not localStorage)
  const reloadProgress = useCallback(async () => {
    try {
      const r = await fetch("/api/chaindex/progress", { cache: "no-store", credentials: "include" });
      if (!r.ok) return;
      const j = await r.json();
      const toSet = (arr: string[]) => new Set(arr.map((x) => normKey(x)));
      setDiscovered({
        animal: toSet(j.discovered?.animal ?? []),
        country: toSet(j.discovered?.country ?? []),
        screen_top250: toSet(j.discovered?.screen ?? []),
        brand_top250: toSet(j.discovered?.brand ?? []),
        food_top250: toSet(j.discovered?.food ?? []),
        name_top1000: toSet(j.discovered?.name ?? []),
      });
      setClaimed({
        animal: toSet(j.claimed?.animal ?? []),
        country: toSet(j.claimed?.country ?? []),
        screen_top250: toSet(j.claimed?.screen ?? []),
        brand_top250: toSet(j.claimed?.brand ?? []),
        food_top250: toSet(j.claimed?.food ?? []),
        name_top1000: toSet(j.claimed?.name ?? []),
      });
    } catch {}
  }, []);

  useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  // Totals
  const totals = useMemo(() => {
    const per = {} as Record<Tab, { total: number; discovered: number; claimed: number }>;
    for (const t of TABS) {
      per[t] = {
        total: data[t]?.length || 0,
        discovered: discovered[t]?.size || 0,
        claimed: claimed[t]?.size || 0,
      };
    }
    const total = TABS.reduce((acc, t) => acc + per[t].total, 0);
    const found = TABS.reduce((acc, t) => acc + per[t].claimed, 0);
    return { per, total, found };
  }, [data, discovered, claimed]);

  // Claim handler (server-only)
  const onClaim = useCallback(
    async (tab: Tab, word: string, fromRect?: DOMRect) => {
      const key = normKey(word);
      if (!discovered[tab].has(key) || claimed[tab].has(key)) return;

      if (fromRect) flyCoinsFromRect(fromRect, 5);

      const catForServer: Record<Tab, "animal" | "country" | "screen" | "brand" | "food" | "name"> = {
        animal: "animal",
        country: "country",
        screen_top250: "screen",
        brand_top250: "brand",
        food_top250: "food",
        name_top1000: "name",
      };

      try {
        await claimDexEntry({ category: catForServer[tab], word });
        // Optimistic update
        setDiscovered((prev) => {
          const nx = { ...prev, [tab]: new Set(prev[tab]) };
          nx[tab].delete(key);
          return nx;
        });
        setClaimed((prev) => {
          const nx = { ...prev, [tab]: new Set(prev[tab]) };
          nx[tab].add(key);
          return nx;
        });
        // Re-sync from server
        reloadProgress();
      } catch {
        // ignore; user can retry
      }
    },
    [discovered, claimed, reloadProgress]
  );

  /** ---------- Tile Grid (shared) ---------- */
  const Grid: React.FC<{ tab: Tab }> = ({ tab }) => {
    const words = data[tab] || [];
    const disc = discovered[tab];
    const clm = claimed[tab];

    const tilePad = "p-4";

    return (
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {words.map((w) => {
          const key = normKey(w);
          const isClaimed = clm.has(key);
          const isDiscovered = disc.has(key) || isClaimed;
          const isClickableToClaim = isDiscovered && !isClaimed;

          const state: DexState = isClaimed ? "claimed" : isDiscovered ? "discovered" : "locked";

          const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isClickableToClaim) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onClaim(tab, w, rect);
          };

          return (
            <button
              key={`${tab}:${w}`}
              className={[
                "group relative aspect-square overflow-hidden rounded-2xl border text-left transition",
                tilePad,
                isClaimed
                  ? "border-emerald-300/80 bg-white/80 hover:shadow dark:bg-slate-900/60 dark:border-emerald-600/60"
                  : isDiscovered
                  ? "border-yellow-300 bg-white/70 dark:bg-slate-900/60 dark:border-yellow-500 shadow-[0_0_16px_rgba(234,179,8,.25)]"
                  : "border-neutral-200 bg-neutral-100/60 dark:border-slate-800 dark:bg-slate-900/40",
              ].join(" ")}
              disabled={!isClickableToClaim}
              onClick={onClick}
              title={isClaimed ? w : isDiscovered ? "Click to claim!" : "Locked"}
            >
              <div className="flex h-full w-full flex-col items-center justify-center">
                {/* Icon per tab */}
                {tab === "animal" && <DexAnimalIcon name={w} state={state} size={44} />}
                {tab === "country" && (
                  <Flag
                    countryName={w}
                    size={40}
                    className={
                      state === "locked"
                        ? "opacity-40 grayscale"
                        : state === "discovered"
                        ? "animate-pulse"
                        : ""
                    }
                  />
                )}
                {tab === "screen_top250" && <ScreenIcon title={w} state={state} size={44} />}
                {tab === "brand_top250" && <BrandIcon name={w} state={state} size={44} />}
                {tab === "food_top250" && <FoodIcon name={w} state={state} size={44} />}
                {tab === "name_top1000" && <NameIcon name={w} state={state} size={44} />}

                {/* Label only when claimed (keeps discovery surprise) */}
                <div
                  className={`mt-2 text-base font-semibold text-center leading-snug line-clamp-2 ${
                    isClaimed ? "" : "opacity-0 select-none"
                  }`}
                >
                  {w}
                </div>
              </div>

              {/* discovered ring / claimed glow */}
              {isDiscovered && !isClaimed && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-amber-400/50" />
              )}
              {isClaimed && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-emerald-400/60 shadow-[0_0_24px_rgba(16,185,129,.35)]" />
              )}
              {!isDiscovered && (
                <div className="pointer-events-none absolute bottom-1 right-1 text-xs opacity-40">?</div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ChainDex</h1>
        </div>
        <div className="text-sm">
          <div className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
            <span className="mr-3">Collected:</span>
            <b>{totals.found}</b> / <b>{totals.total}</b>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-2 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const is = active === t;
          const stats = totals.per[t];
          return (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                is
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 border-neutral-200 dark:border-slate-700",
              ].join(" ")}
            >
              {LABEL[t]}
              <span className="ml-2 text-xs opacity-80">
                {stats.claimed}/{stats.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab */}
      <div className="rounded-2xl border p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{LABEL[active]}</h2>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Claimed: {totals.per[active].claimed} · Discovered: {totals.per[active].discovered} · Total:{" "}
            {totals.per[active].total}
          </div>
        </div>
        <Grid tab={active} />
      </div>

      <div className="mt-8 text-sm opacity-70">
        <Link href="/play" className="underline">
          Back to Play
        </Link>
      </div>
    </main>
  );
}
