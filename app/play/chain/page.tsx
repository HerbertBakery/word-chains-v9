// app/play/chain/page.tsx
"use client";

export const dynamic = "force-dynamic"; // avoid SSG issues with search params

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useSound } from "@/app/hooks/useSound";
import { useVFX, VfxProvider } from "@/app/hooks/useVFX";

import {
  ChainKey,
  firstLetter,
  lastLetter,
  makeDetectors,
  norm,
  stripCorpSuffixes,
} from "@/lib/game/shared";

import { prngFromSeed } from "@/lib/seed";
import ChainLeaderboard from "./ChainLeaderboard";
import { recordDiscovery } from "@/lib/chaindex";
import type { DexCat } from "@/lib/chaindex";

import { useDeck } from "@/app/hooks/useDeck";

type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

const CARD_MULT: Record<Rarity, number> = {
  COMMON: 2,
  RARE: 3,
  EPIC: 5,
  LEGENDARY: 10,
};
const CARD_THRESH: Record<Rarity, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

/* ========================================================================== */

const CHAIN_BASE = {
  normal: 1,
  name: 2,
  animal: 3,
  country: 5,
  food: 2.5,
  brand: 2.0,
  screen: 2.0,
} as const;

const CHAIN_STEP_GROWTH = 0.3;
const SKIP_START = 1;
const SKIP_STREAK_FOR_AWARD = 3;
const SKIP_MAX = 2;

const fmt = (x: number) => `x${x.toFixed(2)}`;

type ChainState = { length: number; multiplier: number };

const CAT_LABELS: Record<ChainKey, string> = {
  name: "Names",
  animal: "Animals",
  country: "Countries",
  food: "Foods",
  brand: "Brands",
  screen: "TV/Movies",
};
const CAT_COLORS: Record<ChainKey, string> = {
  name: "from-blue-500/20 to-blue-500/10",
  animal: "from-green-500/20 to-green-500/10",
  country: "from-purple-500/20 to-purple-500/10",
  food: "from-amber-500/20 to-amber-500/10",
  brand: "from-rose-500/20 to-rose-500/10",
  screen: "from-teal-500/20 to-teal-500/10",
};
const CAT_BORDER: Record<ChainKey, string> = {
  name: "border-blue-300 dark:border-blue-700",
  animal: "border-green-300 dark:border-green-700",
  country: "border-purple-300 dark:border-purple-700",
  food: "border-amber-300 dark:border-amber-700",
  brand: "border-rose-300 dark:border-rose-700",
  screen: "border-teal-300 dark:border-teal-700",
};
const ALL: ChainKey[] = ["name", "animal", "country", "food", "brand", "screen"];

/** left vs right powers */
const LEFT_CATS: ChainKey[] = ["name", "animal", "country"];
const RIGHT_CATS: ChainKey[] = ["food", "brand", "screen"];

type PowerRule = { threshold?: number; label?: string };
const POWER_RULES: Record<ChainKey, PowerRule> = {
  country: { threshold: 5, label: "Nuke" },
  name: { threshold: 5, label: "ChatGPT" },
  food: { threshold: 3, label: "Letter Roll" },
  screen: { threshold: 6, label: "Time Freeze" },
  brand: { threshold: 3, label: "Influencer" },
  animal: { threshold: 3, label: "Beast Mode" },
};

const CHAIN_TO_DEX: Record<ChainKey, DexCat> = {
  name: "name",
  animal: "animal",
  country: "country",
  food: "food",
  brand: "brand",
  screen: "screen",
};

/* ===================== Rarity color mapping ===================== */
const RARITY_STYLE: Record<Rarity, any> = {
  COMMON: {
    card: "bg-green-500/20",
    border: "border-green-500/40",
    text: "text-green-800 dark:text-green-200",
    chip: "bg-green-500/80 text-white",
  },
  RARE: {
    card: "bg-blue-500/20",
    border: "border-blue-500/40",
    text: "text-blue-800 dark:text-blue-200",
    chip: "bg-blue-500/80 text-white",
  },
  EPIC: {
    card: "bg-purple-500/20",
    border: "border-purple-500/40",
    text: "text-purple-800 dark:text-purple-200",
    chip: "bg-purple-500/80 text-white",
  },
  LEGENDARY: {
    card: "bg-amber-500/20",
    border: "border-amber-500/40",
    text: "text-amber-800 dark:text-amber-200",
    chip: "bg-amber-500/80 text-white",
  },
};

/* ===================== PowerCard component ===================== */
/** Tweaks:
 *  - Added max-w and mx-auto so the rectangles are shorter (narrower) and visually tighter.
 *  - This reduces “visual length” on the sides to afford a wider-feeling center column.
 */
function PowerCard({
  cat,
  charges,
  threshold,
  length,
  onUse,
}: {
  cat: ChainKey;
  charges: number;
  threshold?: number;
  length: number;
  onUse: (c: ChainKey) => void;
}) {
  const prog = threshold ? length % threshold : 0;
  const pct = threshold
    ? Math.min(100, Math.floor((prog / threshold) * 100))
    : 0;

  return (
    <div
      key={cat}
      className={`relative overflow-hidden rounded-2xl border px-3 py-3 bg-white/70 dark:bg-slate-900/60 ${CAT_BORDER[cat]} max-w-[220px] mx-auto`} // ← compact side card
    >
      {threshold && (
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r ${CAT_COLORS[cat]}`}
          style={{ clipPath: `inset(0 ${(100 - pct)}% 0 0)` }}
          aria-hidden
        />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <div className="font-semibold">{CAT_LABELS[cat]}</div>
        {!threshold && <div className="text-xs opacity-60">No Power</div>}
      </div>
      <div className="relative z-10 mt-2 flex items-center justify-between">
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-2 rounded-full bg-slate-900 dark:bg-slate-100 transition-all"
            style={{ width: `${threshold ? pct : 0}%` }}
          />
        </div>
        <div className="ml-3 shrink-0 flex items-center gap-2">
          {threshold && (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs tabular-nums ${
                charges > 0
                  ? "border-emerald-400 text-emerald-600 dark:border-emerald-300 dark:text-emerald-300"
                  : "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
              }`}
              title="Charges available"
            >
              {charges}
            </span>
          )}
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow ${
              threshold && charges > 0
                ? "bg-emerald-600 text-white hover:opacity-90"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            disabled={!threshold || charges <= 0}
            onClick={() => onUse(cat)}
            title={
              threshold
                ? charges > 0
                  ? `Use ${POWER_RULES[cat].label} (${charges})`
                  : `${POWER_RULES[cat].label} locked`
                : "No power configured"
            }
          >
            {threshold ? POWER_RULES[cat].label ?? "Locked" : "No Power"}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ===================== Inner component (uses useSearchParams) ===================== */
function ChainModeInner() {
  const { play } = useSound();
  const vfx = useVFX();

  const sp = useSearchParams();
  const seed = sp.get("seed") || "";
  const matchId = sp.get("match");

  const seededRand = useMemo(() => prngFromSeed(seed), [seed]);
  const rand = useCallback(() => (seed ? seededRand() : Math.random()), [seed, seededRand]);

  /* ===================== Load datasets ===================== */
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [animals, setAnimals] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Set<string>>(new Set());
  const [foods, setFoods] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [screens, setScreens] = useState<Set<string>>(new Set());

  const [dictNorm, setDictNorm] = useState<Set<string>>(new Set());
  const [animalsNorm, setAnimalsNorm] = useState<Set<string>>(new Set());
  const [countriesNorm, setCountriesNorm] = useState<Set<string>>(new Set());
  const [namesNorm, setNamesNorm] = useState<Set<string>>(new Set());
  const [foodsNorm, setFoodsNorm] = useState<Set<string>>(new Set());
  const [brandsNorm, setBrandsNorm] = useState<Set<string>>(new Set());
  const [screensNorm, setScreensNorm] = useState<Set<string>>(new Set());

  const [strictDictionary, setStrictDictionary] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [loadMsg, setLoadMsg] = useState("Loading…");
  useEffect(() => {
    (async () => {
      const TOTAL = 7;
      let done = 0;
      const bump = (label: string) => {
        done += 1;
        setLoadPct(Math.round((done / TOTAL) * 100));
        setLoadMsg(label);
      };
      const getArr = async (url: string) => {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) return [];
          const j = await r.json();
          const arr = (Array.isArray(j) ? j : [])
            .map((x: any) => (typeof x === "string" ? x : x?.name))
            .filter(Boolean);
          return arr.map((x: string) => x.trim());
        } catch {
          return [];
        }
      };

      const [d, a, c, n, f, b, s] = await Promise.all([
        getArr("/wordchains/dictionary.json").finally(() => bump("Dictionary")),
        getArr("/wordchains/animals.json").finally(() => bump("Animals")),
        getArr("/wordchains/countries.json").finally(() => bump("Countries")),
        getArr("/wordchains/names.json").finally(() => bump("Names")),
        getArr("/wordchains/foods.json").finally(() => bump("Foods")),
        getArr("/wordchains/brands.json").finally(() => bump("Brands")),
        getArr("/wordchains/screen.json").finally(() => bump("TV & Movies")),
      ]);

      setDict(new Set(d.map((x) => x.toLowerCase())));
      setAnimals(new Set(a.map((x) => x.toLowerCase())));
      setCountries(new Set(c.map((x) => x.toLowerCase())));
      setNames(new Set(n.map((x) => x.toLowerCase())));
      setFoods(new Set(f.map((x) => x.toLowerCase())));
      setBrands(new Set(b.map((x) => x.toLowerCase())));
      setScreens(new Set(s.map((x) => x.toLowerCase())));

      setDictNorm(new Set(d.map((x) => norm(String(x)))));
      setAnimalsNorm(new Set(a.map((x) => norm(String(x)))));
      setCountriesNorm(new Set(c.map((x) => norm(String(x)))));
      setNamesNorm(new Set(n.map((x) => norm(String(x)))));
      setFoodsNorm(new Set(f.map((x) => norm(String(x)))));
      setBrandsNorm(new Set(b.map((x) => norm(stripCorpSuffixes(String(x))))));
      setScreensNorm(new Set(s.map((x) => norm(String(x)))));
    })();
  }, []);

  const detectors = useMemo(() => {
    return makeDetectors({
      dict, animals, countries, names, foods, brands, screens,
      dictNorm, animalsNorm, countriesNorm, namesNorm, foodsNorm, brandsNorm, screensNorm,
      strictDictionary,
    });
  }, [
    dict, animals, countries, names, foods, brands, screens,
    dictNorm, animalsNorm, countriesNorm, namesNorm, foodsNorm, brandsNorm, screensNorm,
    strictDictionary,
  ]);

  const { getCategories, validateWord } = detectors;

  /* ===================== Game state ===================== */
  const [started, setStarted] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [last, setLast] = useState<string>("start");
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);

  // Accurate chain length that never resets on NUKE
  const [chainLength, setChainLength] = useState(0);

  const [skips, setSkips] = useState(SKIP_START);
  const [correctStreak, setCorrectStreak] = useState(0);

  const [timeLeft, setTimeLeft] = useState(15);
  const [freezeLeft, setFreezeLeft] = useState(0);
  const freezeUntilRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showBoard, setShowBoard] = useState(false);
  const [category, setCategory] = useState<ChainKey>("animal");

  const [basePowerMult, setBasePowerMult] = useState(1);
  const [chains, setChains] = useState<Record<ChainKey, ChainState>>({
    name: { length: 0, multiplier: 1 },
    animal: { length: 0, multiplier: 1 },
    country: { length: 0, multiplier: 1 },
    food: { length: 0, multiplier: 1 },
    brand: { length: 0, multiplier: 1 },
    screen: { length: 0, multiplier: 1 },
  });

  // Start charges: all 1 except Brands & Animals (start at 0)
  const [powerCharges, setPowerCharges] = useState<Record<ChainKey, number>>({
    name: 1, animal: 0, country: 1, food: 1, brand: 0, screen: 1,
  });

  const [resultHref, setResultHref] = useState<string | null>(null);

  // Submit status
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalMult =
    Math.max(
      1,
      chains.name.multiplier +
        chains.animal.multiplier +
        chains.country.multiplier +
        chains.food.multiplier +
        chains.brand.multiplier +
        chains.screen.multiplier
    );

  /* ===================== Deck state & charge tracking ===================== */
  const { slots } = useDeck();
  const [lastUseByCat, setLastUseByCat] = useState<Record<ChainKey, number>>({
    name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0,
  });

  // NEW: track which deck slots have been used this run; used cards are crossed-out, colorless, disabled, and stop charging.
  const [usedDeckSlots, setUsedDeckSlots] = useState<Set<number>>(new Set());

  function isDeckCardReady(cat: ChainKey, rarity: Rarity): boolean {
    const need = CARD_THRESH[rarity];
    const lastUseLen = lastUseByCat[cat] ?? 0;
    const currentLen = chains[cat].length;
    const since = Math.max(0, currentLen - lastUseLen);
    return since >= need;
  }

  /* ===================== Helpers ===================== */
  const pickStarter = useCallback(() => {
    if (!dict || dict.size === 0) return "start";
    const arr = Array.from(dict).filter((w) => w.length >= 4 && w.length <= 7);
    if (arr.length === 0) return "start";
    const idx = Math.floor(rand() * arr.length);
    return arr[idx];
  }, [dict, rand]);

  const nextCategory = useCallback(() => {
    const idx = Math.floor(rand() * ALL.length);
    setCategory(ALL[idx]);
  }, [rand]);

  const resetRun = useCallback(() => {
    setIsOver(false);
    setUsed(new Set());
    setScore(0);
    setChainLength(0);
    setBasePowerMult(1);
    setChains({
      name: { length: 0, multiplier: 1 },
      animal: { length: 0, multiplier: 1 },
      country: { length: 0, multiplier: 1 },
      food: { length: 0, multiplier: 1 },
      brand: { length: 0, multiplier: 1 },
      screen: { length: 0, multiplier: 1 },
    });
    setPowerCharges({ name: 1, animal: 0, country: 1, food: 1, brand: 0, screen: 1 });
    setSkips(SKIP_START);
    setCorrectStreak(0);
    setShowBoard(false);
    setResultHref(null);
    setSubmitState("idle");
    setSubmitError(null);
    freezeUntilRef.current = null;
    setFreezeLeft(0);
    setLast(pickStarter());
    nextCategory();
    setTimeLeft(15);
    setLastUseByCat({ name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0 });
    setUsedDeckSlots(new Set()); // reset used deck cards
  }, [pickStarter, nextCategory]);

  const start = () => {
    setStarted(true);
    resetRun();
  };

  /* ===================== Timer loop (with freeze) ===================== */
  useEffect(() => {
    if (!started || isOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const until = freezeUntilRef.current;
      if (until && now < until) {
        const left = Math.max(0, Math.ceil((until - now) / 1000));
        setFreezeLeft(left);
        return;
      } else {
        if (freezeLeft !== 0) setFreezeLeft(0);
      }
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started, isOver, freezeLeft]);

  useEffect(() => {
    if (!started || isOver) return;
    if (timeLeft === 0) {
      setIsOver(true);
      try { play("gameover"); } catch {}
    }
  }, [timeLeft, started, isOver, play]);

  /* ===================== Auto-submit (Ranked + Chain) ===================== */
  const postedRef = useRef(false);
  useEffect(() => {
    if (!started || !isOver) return;
    if (postedRef.current) return;

    const submit = async () => {
      postedRef.current = true;
      setSubmitState("idle");
      setSubmitError(null);

      const headers = { "content-type": "application/json", "cache-control": "no-store" as const };
      const postJson = (url: string, body: any) =>
        fetch(url, { method: "POST", headers, credentials: "include", body: JSON.stringify(body) });

      try {
        if (matchId) {
          const r = await fetch(`/api/ranked/${matchId}`, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify({ chainLength, score }),
          });
          if (!r.ok) {
            const msg = `Ranked submit failed: ${r.status} ${r.statusText}`;
            console.warn(msg);
            setSubmitState("error");
            setSubmitError(msg);
            return;
          }
        }

        const r2 = await postJson("/api/chain/submit", { score, longestChain: chainLength });
        if (!r2.ok) {
          const msg = `Chain submit failed: ${r2.status} ${r2.statusText}`;
          console.warn(msg);
          setSubmitState("error");
          setSubmitError(msg);
          return;
        }

        setSubmitState("success");
        if (matchId) setResultHref(`/play/ranked/result?match=${matchId}`);
      } catch (err: any) {
        const msg = `Submit error: ${err?.message ?? String(err)}`;
        console.warn(msg);
        setSubmitState("error");
        setSubmitError(msg);
      }
    };

    void submit();
  }, [started, isOver, chainLength, score, matchId]);

  /* ===================== Typing SFX ===================== */
  const onKeyDownSFX = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOver) return;
      const k = e.key;
      if (k.length === 1 && /[a-zA-Z0-9' -]/.test(k)) {
        try { play("typing", { volume: 0.7 }); } catch {}
      }
    },
    [isOver, play]
  );

  /* ===================== Skip & accept ===================== */
  const grantSkipIfStreakMet = useCallback(() => {
    setCorrectStreak((prev) => {
      const next = prev + 1;
      if (next >= SKIP_STREAK_FOR_AWARD) {
        setSkips((s) => Math.min(SKIP_MAX, s + 1));
        return 0;
      }
      return next;
    });
  }, []);
  const breakStreak = useCallback(() => setCorrectStreak(0), []);

  const doSkip = useCallback(() => {
    if (isOver || !started) return;
    if (skips <= 0) return;
    setSkips((s) => Math.max(0, s - 1));
    setCorrectStreak(0);
    try { play("coin", { volume: 0.9 }); } catch {}
    setLast(pickStarter());
    nextCategory();
    setTimeLeft(15);
  }, [isOver, started, skips, play, pickStarter, nextCategory]);

  /* ===================== applyAcceptedWord (supports extraMultiplier) ===================== */
  const applyAcceptedWord = useCallback((w: string, extraMultiplier: number = 1) => {
    const wl = w.toLowerCase();

    const enteringCats = getCategories(w);
    setChains((prev) => {
      const next = { ...prev };
      enteringCats.forEach((k) => {
        const c = next[k];
        next[k] = { length: c.length + 1, multiplier: Math.max(1, c.multiplier + CHAIN_STEP_GROWTH) };
      });
      return next;
    });

    // Handle power charging + READY sfx
    setPowerCharges((prev) => {
      const nx = { ...prev };
      enteringCats.forEach((k) => {
        const rule = POWER_RULES[k];
        if (!rule?.threshold) return;
        const before = chains[k].length;
        const after = before + 1;
        const beforeTier = Math.floor(before / rule.threshold);
        const afterTier = Math.floor(after / rule.threshold);
        const gained = afterTier - beforeTier;
        if (gained > 0) {
          nx[k] = (nx[k] || 0) + gained;
          try {
            for (let i = 0; i < gained; i++) play(`power_${k}_ready`);
          } catch {}
        }
      });
      return nx;
    });

    const catsArr = Array.from(enteringCats);
    const base = catsArr.length ? Math.max(...catsArr.map((k) => (CHAIN_BASE as any)[k] ?? 1)) : CHAIN_BASE.normal;
    const gainedPoints = Math.round(w.length * base * totalMult * Math.max(1, basePowerMult) * Math.max(1, extraMultiplier));
    setScore((s) => s + gainedPoints);

    // Record discovery
    try {
      const dexCats = new Set<DexCat>();
      enteringCats.forEach((k) => dexCats.add(CHAIN_TO_DEX[k]));
      if (dexCats.size) void recordDiscovery({ word: w, categories: dexCats });
    } catch {}

    try { play("accept"); } catch {}
    try { vfx.ringBurstAtFromEl("input[name='word']"); } catch {}

    setUsed((u) => new Set(u).add(wl));
    setChainLength((n) => n + 1);
    setLast(w);
    setTimeLeft(15);
    nextCategory();

    grantSkipIfStreakMet();
  }, [getCategories, nextCategory, play, vfx, totalMult, basePowerMult, grantSkipIfStreakMet, chains]);

  /* ===================== Powers ===================== */
  const getSetForCategory = useCallback((cat: ChainKey): Set<string> => {
    switch (cat) {
      case "animal": return animals;
      case "country": return countries;
      case "name": return names;
      case "food": return foods;
      case "brand": return brands;
      case "screen": return screens;
    }
  }, [animals, countries, names, foods, brands, screens]);

  const pickAutoWordForCurrent = useCallback(async (): Promise<string | null> => {
    const pool = Array.from(getSetForCategory(category) || []);
    if (!pool.length) return null;

    const requiredStart = last === "start" ? null : lastLetter(last).toLowerCase();
    const requiredContains = last === "start" ? null : firstLetter(last).toLowerCase();

    for (let tries = 0; tries < 1200; tries++) {
      const w = pool[Math.floor(rand() * pool.length)];
      const wlow = w.toLowerCase();
      if (used.has(wlow)) continue;

      if (requiredStart && wlow[0] !== requiredStart) continue;
      if (requiredContains && !wlow.includes(requiredContains)) continue;

      const ok = await validateWord(w);
      if (!ok) continue;

      const cats = getCategories(w);
      if (!cats.has(category)) continue;

      return w;
    }
    return null;
  }, [category, getSetForCategory, last, used, validateWord, getCategories, rand]);

  const triggerPower = useCallback(async (cat: ChainKey) => {
    const rule = POWER_RULES[cat];
    if (!rule?.threshold || (powerCharges[cat] ?? 0) <= 0) return;

    // consume a charge + USE sfx
    setPowerCharges((prev) => ({ ...prev, [cat]: Math.max(0, (prev[cat] || 0) - 1) }));
    try { play(`power_${cat}_use`); } catch {}

    if (cat === "country") {
      setUsed(new Set()); // NUKE
      try { play("nuke"); } catch {}
      try { vfx.glowOnce("main"); } catch {}
    } else if (cat === "name") {
      const chosen = await pickAutoWordForCurrent();
      if (!chosen) {
        // refund the charge
        setPowerCharges((prev) => ({ ...prev, [cat]: (prev[cat] || 0) + 1 }));
        try { play("lifeLost"); } catch {}
        try { vfx.shake(".deckbar", 350); } catch {}
        return;
      }
      try { play("ai"); } catch {}
      try { vfx.confettiBurst({ power: 0.6 }); } catch {}
      applyAcceptedWord(chosen);
    } else if (cat === "food") {
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      if (last !== "start") {
        const current = lastLetter(last).toLowerCase();
        let nextChar: string | null = current;
        let guard = 0;
        while (nextChar === current && guard < 100) {
          nextChar = alphabet[Math.floor(rand() * alphabet.length)];
          guard++;
        }
        const base = last.slice(0, -1);
        setLast(base + (nextChar as string));
      }
      try { play("roll"); } catch {}
      try { vfx.ringBurstAtFromEl(".rounded-2xl.border.p-5"); } catch {}
    } else if (cat === "screen") {
      const now = Date.now();
      const extra = 15_000;
      const current = freezeUntilRef.current && freezeUntilRef.current > now ? freezeUntilRef.current : now;
      freezeUntilRef.current = current + extra;
      setFreezeLeft(Math.max(0, Math.ceil((freezeUntilRef.current - now) / 1000)));
      try { play("freeze"); } catch {}
      try { vfx.glowOnce(".h-2.w-full.rounded-full"); } catch {}
    } else if (cat === "brand") {
      setBasePowerMult((m) => m + 3);
      try { play("influencer"); } catch {}
      try { vfx.confettiBurst({ power: 0.9 }); } catch {}
    } else if (cat === "animal") {
      setBasePowerMult((m) => m + 1);
      try { play("same-letter-power"); } catch {}
      try { vfx.confettiBurst({ power: 0.35 }); } catch {}
    }
  }, [powerCharges, play, vfx, pickAutoWordForCurrent, applyAcceptedWord, last, rand]);

  /* ===================== Click-to-use deck card ===================== */
  const useDeckCard = useCallback(async (slotIdx: number) => {
    if (!started || isOver) return;

    // If this slot's card was already used this run, it's permanently disabled.
    if (usedDeckSlots.has(slotIdx)) {
      try { play("used"); } catch {}
      try { vfx.shake(".deckbar", 200); } catch {}
      return;
    }

    const slot = (slots || []).find(s => s.slotIndex === slotIdx);
    const card = slot?.card as (null | { word: string; category: ChainKey; rarity: Rarity });
    if (!card) return;

    if (card.category !== category) {
      try { play("lifeLost"); } catch {}
      try { vfx.shake(".deckbar", 250); } catch {}
      return;
    }

    if (!isDeckCardReady(category, card.rarity)) {
      try { play("lifeLost"); } catch {}
      try { vfx.shake(".deckbar", 250); } catch {}
      return;
    }

    const w = card.word.trim();
    const wl = w.toLowerCase();

    if (used.has(wl)) {
      try { play("used"); } catch {}
      try { vfx.shake(".deckbar", 250); } catch {}
      return;
    }

        // More forgiving validation for deck cards (handles punctuation like ":" or "-")
    const tryWord = async (s: string) => {
      const ok = await validateWord(s);
      const cats = getCategories(s);
      return { ok, cats };
    };

    let { ok, cats } = await tryWord(w);

    if (!ok || !cats.has(category)) {
      // Retry with a sanitized variant: drop punctuation, collapse spaces.
      const alt = w
        .replace(/[:\-–—]/g, " ")                // turn separators into spaces
        .replace(/[^\p{L}\p{N} ]/gu, "")         // strip other punctuation
        .replace(/\s+/g, " ")
        .trim();

      if (alt && alt !== w) {
        const res = await tryWord(alt);
        ok = res.ok;
        cats = res.cats;
      }
    }

    if (!ok || !cats.has(category)) {
      // Final fallback: deck cards are curated and already category-locked above.
      // If it’s charged and category matches, allow usage even if detector missed the exact title formatting.
      if (card.category !== category) {
        try { play("lifeLost"); } catch {}
        try { vfx.shake(".deckbar", 250); } catch {}
        return;
      }
      // proceed (treated as valid)
    }


    const mult = CARD_MULT[card.rarity] || 1;
    const nextLen = (chains[category].length || 0) + 1;
    setLastUseByCat(prev => ({ ...prev, [category]: nextLen }));

    try { play("coin"); } catch {}
    try { vfx.confettiBurst({ power: 0.6 }); } catch {}

    applyAcceptedWord(w, mult);

    // Mark this slot as permanently used (crossed out, colorless, disabled, no further charging).
    setUsedDeckSlots(prev => {
      const nx = new Set(prev);
      nx.add(slotIdx);
      return nx;
    });
  }, [started, isOver, slots, category, isDeckCardReady, used, validateWord, getCategories, chains, applyAcceptedWord, play, vfx, usedDeckSlots]);

  /* ===================== Submit handler ===================== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (input?.value || "").trim();
    if (!raw) return;
    const w = raw;
    const wl = w.toLowerCase();
    input.value = "";

    if (used.has(wl)) {
      breakStreak();
      try { play("used"); } catch {}
      try { vfx.shake("input[name='word']", 300); } catch {}
      return;
    }

    if (last !== "start") {
      const requiredStart = lastLetter(last).toLowerCase();
      if (w[0].toLowerCase() !== requiredStart) {
        breakStreak();
        try { play("lifeLost"); } catch {}
        try { vfx.shake("input[name='word']", 300); } catch {}
        return;
      }
      if (!w.toLowerCase().includes(firstLetter(last).toLowerCase())) {
        breakStreak();
        try { play("lifeLost"); } catch {}
        try { vfx.shake("input[name='word']", 300); } catch {}
        return;
      }
    }

    const cats = detectors.getCategories(w);
    if (!cats.has(category)) {
      breakStreak();
      try { play("lifeLost"); } catch {}
      try { vfx.glowOnce(".rounded-2xl.border.p-5"); } catch {}
      return;
    }

    const ok = await validateWord(w);
    if (!ok) {
      breakStreak();
      try { play("lifeLost"); } catch {}
      try { vfx.shake("input[name='word']", 300); } catch {}
      return;
    }

    applyAcceptedWord(w);
  };
  /* ===================== UI ===================== */
  return (
    <VfxProvider>
      <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 dark:text-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chain Mode</h1>
          <Link
            href="/play"
            className="text-sm underline opacity-80 hover:opacity-100 text-slate-700 dark:text-slate-300"
          >
            ← All Modes
          </Link>
        </div>

        {/* Intro / Start */}
        {!started && !isOver && (
          <div className="rounded-2xl border p-6 bg-white/80 border-gray-200 dark:bg-slate-900/80 dark:border-slate-700">
            <p className="mb-3 text-gray-600 dark:text-slate-300">
              You have <b>15s</b> per word. Follow the same link + dictionary rules as Classic.
              You can’t reuse words. Start with <b>1 skip</b>; earn another after <b>3 correct
              answers in a row</b> (max 2).
            </p>

            <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={strictDictionary}
                onChange={(e) => setStrictDictionary(e.target.checked)}
              />
              Strict dictionary validation
            </label>

            {!dict && (
              <>
                <div className="w-full max-w-md">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-gray-800 dark:bg-slate-200 transition-all"
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {loadMsg} — {loadPct}%
                  </div>
                </div>
              </>
            )}

            <button
              onClick={start}
              className="mt-4 rounded-2xl bg-black px-5 py-3 text-white shadow hover:opacity-90"
              disabled={!dict}
            >
              {dict ? "Start Run" : "Loading dictionary..."}
            </button>
          </div>
        )}

        {/* Playing */}
        {started && !isOver && (
          <>
            {/* xl+: sidebars for powers (3 each) with wide center */}
            <div className="hidden xl:grid gap-6 xl:grid-cols-[220px,minmax(680px,1fr),220px] max-w-[1200px] mx-auto justify-center">
              {/* LEFT POWERS */}
              <aside className="space-y-3">
                <div className="text-sm uppercase tracking-wide opacity-70">Powers</div>
                {LEFT_CATS.map((cat) => (
                  <PowerCard
                    key={cat}
                    cat={cat}
                    charges={powerCharges[cat] || 0}
                    threshold={POWER_RULES[cat].threshold}
                    length={chains[cat].length}
                    onUse={triggerPower}
                  />
                ))}
              </aside>

              {/* CENTER UI */}
              <section className="space-y-6 min-w-0 max-w-[760px] mx-auto">
                {/* 1) Timer */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm uppercase tracking-wide opacity-70">Time Left</span>
                    <div className="flex items-center gap-3">
                      {freezeLeft > 0 && (
                        <span className="rounded-full border px-2 py-0.5 text-xs tabular-nums border-emerald-400 text-emerald-500 dark:border-emerald-300 dark:text-emerald-300">
                          Frozen {freezeLeft}s
                        </span>
                      )}
                      <span className="text-lg font-semibold tabular-nums">{timeLeft}s</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 15) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* 2) Score + Chain + Base Multiplier */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                    <div className="text-xs uppercase tracking-wide opacity-70">Score</div>
                    <div className="text-2xl font-bold tabular-nums">{score}</div>
                  </div>
                  <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                    <div className="text-xs uppercase tracking-wide opacity-70">Chain Length</div>
                    <div className="text-2xl font-bold tabular-nums">{chainLength}</div>
                  </div>
                  <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                    <div className="text-xs uppercase tracking-wide opacity-70">Base Multiplier</div>
                    <div className="text-2xl font-bold">{fmt(basePowerMult)}</div>
                  </div>
                </div>

                {/* 3) Current objective */}
                <div className="rounded-2xl border p-5 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Current Category</div>
                  <div className="text-2xl font-bold">{CAT_LABELS[category]}</div>
                  <div className="mt-2 text-sm opacity-70">
                    Last word:&nbsp;
                    <span className="font-semibold text-2xl leading-none">
                      {last === "start" ? "—" : last}
                    </span>
                  </div>
                  {last !== "start" && (
                    <div className="mt-1 text-xs opacity-70">
                      Required start:&nbsp;
                      <span className="font-semibold uppercase">
                        {lastLetter(last).toUpperCase()}
                      </span>
                      &nbsp;• must contain:&nbsp;
                      <span className="font-semibold uppercase">{firstLetter(last).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* 4) Submit box + Skip */}
                <form onSubmit={onSubmit} className="flex gap-2">
                  <input
                    name="word"
                    placeholder="Type your next word…"
                    className="grow rounded-2xl border px-4 py-3 outline-none ring-0
                               bg-white border-gray-300 text-slate-900 placeholder-slate-400
                               focus:border-black
                               dark:bg-slate-800 dark:border-slate-500 dark:text-slate-100 dark:placeholder-slate-300
                               dark:focus:border-white caret-current"
                    autoFocus
                    onKeyDown={onKeyDownSFX}
                  />
                  <button type="submit" className="rounded-2xl bg-black px-5 py-3 text-white shadow hover:opacity-90">
                    Enter
                  </button>
                  <button
                    type="button"
                    onClick={doSkip}
                    disabled={skips <= 0}
                    className={`rounded-2xl px-5 py-3 shadow hover:opacity-90 ${
                      skips > 0
                        ? "bg-indigo-600 text-white"
                        : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                    title={skips > 0 ? "Skip this category and get a new starter" : "No skips available"}
                  >
                    Skip ({skips})
                  </button>
                </form>

                {/* 5) Deck cards — show rarity colors until used; once used, cross out + grayscale + disabled + no more charging */}
                <div className="deckbar rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Deck Cards</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0,1,2].map(i => {
                      const slot = (slots || []).find(s => s.slotIndex === i);
                      const c = slot?.card as (null | { word: string; category: ChainKey; rarity: Rarity });
                      if (!c) {
                        return (
                          <div key={i} className="rounded-2xl border p-3">
                            <div className="text-xs opacity-70 mb-1">Slot {i+1}</div>
                            <div className="opacity-60 text-sm">Empty</div>
                          </div>
                        );
                      }

                      const usedOut = usedDeckSlots.has(i);
                      const need = CARD_THRESH[c.rarity];
                      const since = Math.max(0, (chains[c.category]?.length ?? 0) - (lastUseByCat[c.category] ?? 0));
                      const ready = !usedOut && c.category === category && since >= need;
                      const clamped = Math.min(since, need);

                      const rs = RARITY_STYLE[c.rarity];
                      const baseCardCls = usedOut
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 grayscale"
                        : `${rs.card} ${rs.border} ${rs.text}`;

                      const chipCls = usedOut
                        ? "bg-slate-400 text-white"
                        : rs.chip;

                      return (
                        <div key={i} className={`relative rounded-2xl border p-3 ${baseCardCls}`}>
                          <div className="text-xs opacity-80 mb-1">Slot {i+1}</div>
                          <div className="flex items-center justify-between">
                            <div className={`font-semibold ${usedOut ? "line-through" : ""}`}>{c.word}</div>
                            <span className={`text-xs rounded-full px-2 py-0.5 ${chipCls}`}>
                              {usedOut ? "USED" : c.rarity}
                            </span>
                          </div>

                          <div className="text-xs opacity-80 mt-1">Category: {c.category}</div>

                          {/* Charge readout — hidden once used */}
                          {!usedOut && (
                            <div className="mt-1 text-xs">
                              {need === 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Ready</span>
                              ) : (
                                <>
                                  Charge:&nbsp;
                                  <span className="tabular-nums font-semibold">
                                    {clamped}/{need}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => void useDeckCard(i)}
                            disabled={usedOut || !ready || isOver}
                            className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold shadow ${
                              usedOut
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                                : ready
                                  ? "bg-emerald-600 text-white hover:opacity-90"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                            }`}
                            title={
                              usedOut
                                ? "Already used this run"
                                : c.category !== category
                                  ? "Available when this category is active"
                                  : ready
                                    ? `Play this card for ×${CARD_MULT[c.rarity]} score`
                                    : "Charging…"
                            }
                          >
                            {usedOut ? "Used" : `Use Card ${ready ? `×${CARD_MULT[c.rarity]}` : ""}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs opacity-70">
                    Cards ignore link constraints (start/contain) but must match the current category and be charged.
                    Once a card is used, it’s crossed out, loses all color, and is disabled for the rest of the run.
                  </div>
                </div>
              </section>

              {/* RIGHT POWERS */}
              <aside className="space-y-3">
                <div className="text-sm uppercase tracking-wide opacity-70">Powers</div>
                {RIGHT_CATS.map((cat) => (
                  <PowerCard
                    key={cat}
                    cat={cat}
                    charges={powerCharges[cat] || 0}
                    threshold={POWER_RULES[cat].threshold}
                    length={chains[cat].length}
                    onUse={triggerPower}
                  />
                ))}
              </aside>
            </div>

            {/* < xl : stack center UI first; compact powers below */}
            <div className="xl:hidden space-y-6">
              {/* 1) Timer */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide opacity-70">Time Left</span>
                  <div className="flex items-center gap-3">
                    {freezeLeft > 0 && (
                      <span className="rounded-full border px-2 py-0.5 text-xs tabular-nums border-emerald-400 text-emerald-500 dark:border-emerald-300 dark:text-emerald-300">
                        Frozen {freezeLeft}s
                      </span>
                    )}
                    <span className="text-lg font-semibold tabular-nums">{timeLeft}s</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 15) * 100))}%` }}
                  />
                </div>
              </div>

              {/* 2) Score + Chain + Base */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide opacity-70">Score</div>
                  <div className="text-2xl font-bold tabular-nums">{score}</div>
                </div>
                <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide opacity-70">Chain Length</div>
                  <div className="text-2xl font-bold tabular-nums">{chainLength}</div>
                </div>
                <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide opacity-70">Base Multiplier</div>
                  <div className="text-2xl font-bold">{fmt(basePowerMult)}</div>
                </div>
              </div>

              {/* 3) Current category */}
              <div className="rounded-2xl border p-5 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Current Category</div>
                <div className="text-2xl font-bold">{CAT_LABELS[category]}</div>
                <div className="mt-2 text-sm opacity-70">
                  Last word:&nbsp;
                  <span className="font-semibold text-2xl leading-none">
                    {last === "start" ? "—" : last}
                  </span>
                </div>
                {last !== "start" && (
                  <div className="mt-1 text-xs opacity-70">
                    Required start:&nbsp;
                    <span className="font-semibold uppercase">
                      {lastLetter(last).toUpperCase()}
                    </span>
                    &nbsp;• must contain:&nbsp;
                    <span className="font-semibold uppercase">{firstLetter(last).toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* 4) Input + Skip */}
              <form onSubmit={onSubmit} className="flex gap-2">
                <input
                  name="word"
                  placeholder="Type your next word…"
                  className="grow rounded-2xl border px-4 py-3 outline-none ring-0
                             bg-white border-gray-300 text-slate-900 placeholder-slate-400
                             focus:border-black
                             dark:bg-slate-800 dark:border-slate-500 dark:text-slate-100 dark:placeholder-slate-300
                             dark:focus:border-white caret-current"
                  autoFocus
                  onKeyDown={onKeyDownSFX}
                />
                <button type="submit" className="rounded-2xl bg-black px-5 py-3 text-white shadow hover:opacity-90">
                  Enter
                </button>
                <button
                  type="button"
                  onClick={doSkip}
                  disabled={skips <= 0}
                  className={`rounded-2xl px-5 py-3 shadow hover:opacity-90 ${
                    skips > 0
                      ? "bg-indigo-600 text-white"
                      : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  Skip ({skips})
                </button>
              </form>

              {/* 5) Deck cards (mobile) */}
              <div className="deckbar rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Deck Cards</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0,1,2].map(i => {
                    const slot = (slots || []).find(s => s.slotIndex === i);
                    const c = slot?.card as (null | { word: string; category: ChainKey; rarity: Rarity });
                    if (!c) {
                      return (
                        <div key={i} className="rounded-2xl border p-3">
                          <div className="text-xs opacity-70 mb-1">Slot {i+1}</div>
                          <div className="opacity-60 text-sm">Empty</div>
                        </div>
                      );
                    }

                    const usedOut = usedDeckSlots.has(i);
                    const need = CARD_THRESH[c.rarity];
                    const since = Math.max(0, (chains[c.category]?.length ?? 0) - (lastUseByCat[c.category] ?? 0));
                    const ready = !usedOut && c.category === category && since >= need;
                    const clamped = Math.min(since, need);

                    const rs = RARITY_STYLE[c.rarity];
                    const baseCardCls = usedOut
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 grayscale"
                      : `${rs.card} ${rs.border} ${rs.text}`;

                    const chipCls = usedOut
                      ? "bg-slate-400 text-white"
                      : rs.chip;

                    return (
                      <div key={i} className={`relative rounded-2xl border p-3 ${baseCardCls}`}>
                        <div className="text-xs opacity-80 mb-1">Slot {i+1}</div>
                        <div className="flex items-center justify-between">
                          <div className={`font-semibold ${usedOut ? "line-through" : ""}`}>{c.word}</div>
                          <span className={`text-xs rounded-full px-2 py-0.5 ${chipCls}`}>
                            {usedOut ? "USED" : c.rarity}
                          </span>
                        </div>
                        <div className="text-xs opacity-80 mt-1">Category: {c.category}</div>

                        {!usedOut && (
                          <div className="mt-1 text-xs">
                            {need === 0 ? (
                              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Ready</span>
                            ) : (
                              <>Charge: <span className="tabular-nums font-semibold">{clamped}/{need}</span></>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => void useDeckCard(i)}
                          disabled={usedOut || !ready || isOver}
                          className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold shadow ${
                            usedOut
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                              : ready
                                ? "bg-emerald-600 text-white hover:opacity-90"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {usedOut ? "Used" : `Use Card ${ready ? `×${CARD_MULT[c.rarity]}` : ""}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compact powers */}
              <div className="mt-4">
                <div className="text-sm uppercase tracking-wide opacity-70 mb-2">Powers</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...LEFT_CATS, ...RIGHT_CATS].map((cat) => (
                    <PowerCard
                      key={cat}
                      cat={cat}
                      charges={powerCharges[cat] || 0}
                      threshold={POWER_RULES[cat].threshold}
                      length={chains[cat].length}
                      onUse={triggerPower}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Run over: stats + actions */}
        {isOver && (
          <div className="rounded-2xl border p-6 text-center bg-white/80 border-gray-200 dark:bg-slate-900/80 dark:border-slate-700">
            <h2 className="mb-1 text-xl font-bold">Run Over</h2>

            {submitState === "success" && (
              <p className="opacity-80">Your score has been submitted.</p>
            )}
            {submitState !== "success" && (
              <p className="opacity-80">
                {submitState === "error"
                  ? `Could not submit score${submitError ? ` — ${submitError}` : ""}.`
                  : "Final score recorded locally."}
              </p>
            )}

            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-4 text-left">
              <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                <div className="text-xs uppercase tracking-wide opacity-70">Chain Length</div>
                <div className="text-2xl font-bold tabular-nums">{chainLength}</div>
              </div>
              <div className="rounded-2xl border p-4 bg-white/70 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700">
                <div className="text-xs uppercase tracking-wide opacity-70">Score</div>
                <div className="text-2xl font-bold tabular-nums">{score}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={start}
                className="rounded-2xl bg-black px-5 py-3 text-white shadow hover:opacity-90"
              >
                Play Again
              </button>

              {matchId ? (
                <>
                  <Link
                    href={resultHref || "#"}
                    className={`rounded-2xl border px-5 py-3 ${resultHref ? "hover:bg-slate-50 dark:hover:bg-slate-800" : "opacity-60 cursor-wait"}`}
                  >
                    {resultHref ? "View Match Result" : "Finalizing…"}
                  </Link>
                  <button
                    onClick={() => setShowBoard(true)}
                    className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    View Leaderboard
                  </button>
                  <Link
                    href="/play/ranked/ladder"
                    className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Play Ladder
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setShowBoard(true)}
                  className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  View Leaderboard
                </button>
              )}

              <Link
                href="/play"
                className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Back to Modes
              </Link>
            </div>

            {showBoard && (
              <div className="mt-8 text-left">
                <ChainLeaderboard />
              </div>
            )}
          </div>
        )}
      </main>
    </VfxProvider>
  );
}

/* ===================== Default export: Suspense wrapper ===================== */
export default function ChainMode() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-2xl border p-6 bg-white/80 dark:bg-slate-900/80">
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </main>
      }
    >
      <ChainModeInner />
    </Suspense>
  );
}
