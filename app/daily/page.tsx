// app/daily/page.tsx — PART A

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

/* ===== Local types (decouple from external to avoid import churn) ===== */
type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";
type DailyGoal =
  | { kind: "category"; cat: ChainKey; count: number }
  | { kind: "trick"; trick: "sameEnds" | "chain"; count: number }
  | { kind: "letter"; letter: string; count: number };

type DailySpec = {
  id: string;
  specId: string;
  dateKey: string;
  timeSeconds: number;
  starter: string;
  goals: DailyGoal[];
  signature: string;
};

/* ===== Reuse your hooks ===== */
import { useSound } from "@/app/hooks/useSound";
import { useVFX } from "@/app/hooks/useVFX";

/* ===== Progress bar UI ===== */
import { LoadingBar } from "@/app/components/LoadingBar";

/* ===== Constants ===== */
const HIDDEN_WORD_BONUS = 1500;

/* ===== Input + normalization helpers (mirrors main game) ===== */
const INPUT_RE = /^[a-zA-Z][a-zA-Z\s'\-&.]*$/; // digits not allowed for typed input already
const stripDiacritics = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[\s'\-&.]/g, "");
const singularize = (w: string) => {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
};
const stripCorpSuffixes = (s: string) =>
  s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();

const lastLetter = (w: string) => w[w.length - 1];
const firstLetter = (w: string) => w[0];
const fmt = (x: number) => `x${x.toFixed(2)}`;
const noDigits = (w: string) => !/\d/.test(w);

/* ===== Types local to page ===== */
type Datasets = {
  dict: Set<string>;
  dictNorm: Set<string>;
  animals: Set<string>;
  animalsNorm: Set<string>;
  countries: Set<string>;
  countriesNorm: Set<string>;
  names: Set<string>;
  namesNorm: Set<string>;
  foods: Set<string>;
  foodsNorm: Set<string>;
  brands: Set<string>;
  brandsNorm: Set<string>;
  screens: Set<string>;
  screensNorm: Set<string>;
};

/* ===== Scoring weights (unchanged, still used for points—not goals) ===== */
const CHAIN_BASE: Record<"normal" | ChainKey, number> = {
  normal: 1,
  name: 2,
  animal: 3,
  country: 5,
  food: 2.5,
  brand: 2,
  screen: 2,
};

const CHAIN_COLORS: Record<
  ChainKey | "main",
  { badge: string; border: string; text: string; label: string; solid: string }
> = {
  main:   { badge: "bg-gray-100 dark:bg-gray-700",   border: "border-gray-400 dark:border-gray-600",   text: "text-gray-800 dark:text-gray-200",   label: "Main",      solid: "bg-gray-200 dark:bg-gray-600" },
  name:   { badge: "bg-blue-100 dark:bg-blue-800",   border: "border-blue-400 dark:border-blue-600",   text: "text-blue-800 dark:text-blue-200",   label: "Names",     solid: "bg-blue-100 dark:bg-blue-900" },
  animal: { badge: "bg-green-100 dark:bg-green-800", border: "border-green-400 dark:border-green-600", text: "text-green-800 dark:text-green-200", label: "Animals",   solid: "bg-green-100 dark:bg-green-900" },
  country:{ badge: "bg-purple-100 dark:bg-purple-800", border: "border-purple-400 dark:border-purple-600", text: "text-purple-800 dark:text-purple-200", label: "Countries", solid: "bg-purple-100 dark:bg-purple-900" },
  food:   { badge: "bg-amber-100 dark:bg-amber-800", border: "border-amber-400 dark:border-amber-600", text: "text-amber-900 dark:text-amber-100", label: "Foods",     solid: "bg-amber-100 dark:bg-amber-900" },
  brand:  { badge: "bg-rose-100 dark:bg-rose-800",   border: "border-rose-400 dark:border-rose-600",   text: "text-rose-800 dark:text-rose-200",   label: "Brands",    solid: "bg-rose-100 dark:bg-rose-900" },
  screen: { badge: "bg-teal-100 dark:bg-teal-800",   border: "border-teal-400 dark:border-teal-600",   text: "text-teal-900 dark:text-teal-100",   label: "TV/Movies", solid: "bg-teal-100 dark:bg-teal-900" },
};

/* ===== Defensive label helper so category tiles never render blank ===== */
const safeLabelForCat = (cat: ChainKey | any) =>
  CHAIN_COLORS[cat as ChainKey]?.label ?? "General";

/* ===== Utilities: localStorage fallbacks ===== */
const LS = {
  keyPlayed: (id: string) => `wc_daily_played_${id}`,
  keyLastId: `wc_daily_last_id`,
  keyPuzzlePing: (id: string) => `wc_puzzle_ping_complete_${id}`,
};
const safeLS = {
  get: (k: string) => {
    try { return typeof window !== "undefined" ? window.localStorage.getItem(k) : null; } catch { return null; }
  },
  set: (k: string, v: string) => {
    try { if (typeof window !== "undefined") window.localStorage.setItem(k, v); } catch {}
  },
};

/* ===== Simple deterministic PRNG (no deps) ===== */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickFrom = <T,>(arr: T[], rnd: () => number) =>
  arr[Math.floor(rnd() * arr.length)];

/* =========================================================================
   Letter goal normalization → Always "Starts with S" with 10–20 target
   ========================================================================= */
function sGoalCount(seedStr?: string): number {
  const seed = xmur3(`wc_s_goal_${seedStr || "default"}`)();
  const rnd = mulberry32(seed);
  return 5 + Math.floor(rnd() * 5); // 5..9
}

/** Keep at most 1 letter goal; override to a single S-goal; total 6 goals. */
function normalizeGoals(src: DailyGoal[], seedStr?: string): DailyGoal[] {
  if (!Array.isArray(src)) return [];
  const sGoal: DailyGoal = { kind: "letter", letter: "s", count: sGoalCount(seedStr) };
  const nonLetters = src.filter(g => g.kind !== "letter");
  const result: DailyGoal[] = [];
  const maxNonLetter = 5;
  for (const g of nonLetters) {
    if (result.length >= maxNonLetter) break;
    result.push(g);
  }
  result.push(sGoal);
  return result.slice(0, 6);
}

/* ===== Visually Obvious "Valid Words" Banner ===== */
function ValidBanner({ text }: { text: string }) {
  return (
    <div
      className="
        relative overflow-hidden rounded-2xl border
        px-4 py-3 text-center font-semibold tracking-wide
        bg-emerald-100/80 border-emerald-300 text-emerald-900
        dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200
        shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]
      "
      aria-live="polite"
      role="status"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <span className="text-lg">✅</span>
        <span className="text-sm sm:text-base">{text}</span>
      </span>
    </div>
  );
}

/* ===== Page component ===== */
export default function DailyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  const [loadPct, setLoadPct] = useState(0); // progress bar
  const vfx = useVFX();
  const sound = useSound();
  const play = sound.play;
  const stop: (...args: any[]) => void =
    (sound as any).stop?.bind(sound) ?? ((..._args: any[]) => {});

  const safePlay = useCallback(
    (key: string, opts?: any) => {
      try { requestAnimationFrame(() => { try { play(key as any, opts); } catch {} }); } catch {}
    },
    [play]
  );

  /* ===== Load datasets WITH PROGRESS ===== */
  const [data, setData] = useState<Datasets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const total = 7;
      const bump = () => setLoadPct(p => Math.min(100, p + 100 / total));

      const get = async (url: string) => {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) return [];
          const j = await r.json();
          const arr = Array.isArray(j) ? j : [];
          return arr.map((x: any) => (typeof x === "string" ? x : x?.name)).filter(Boolean) as string[];
        } catch {
          return [];
        } finally {
          bump();
        }
      };

      setLoadPct(0);

      const [d, a, c, n, f, b, s] = await Promise.all([
        get("/wordchains/dictionary.json"),
        get("/wordchains/animals.json"),
        get("/wordchains/countries.json"),
        get("/wordchains/names.json"),
        get("/wordchains/foods.json"),
        get("/wordchains/brands.json"),
        get("/wordchains/screen.json"),
      ]);

      // Build Sets
      const dict = new Set(d.map(w => w.toLowerCase()));
      const animals = new Set(a.map(w => w.toLowerCase()));
      const countries = new Set(c.map(w => w.toLowerCase()));
      const names = new Set(n.map(w => w.toLowerCase()));
      const foods = new Set(f.map(w => w.toLowerCase()));
      const brands = new Set(b.map(w => w.toLowerCase()));
      const screens = new Set(s.map(w => w.toLowerCase()));

      // Normalized Sets
      const dictNorm = new Set(d.map(w => norm(String(w))));
      const animalsNorm = new Set(a.map(w => norm(String(w))));
      const countriesNorm = new Set(c.map(w => norm(String(w))));
      const namesNorm = new Set(n.map(w => norm(String(w))));
      const foodsNorm = new Set(f.map(w => norm(String(w))));
      const brandsNorm = new Set(b.map(w => norm(stripCorpSuffixes(String(w)))));
      const screensNorm = new Set(s.map(w => norm(String(w))));

      setData({
        dict, dictNorm,
        animals, animalsNorm,
        countries, countriesNorm,
        names, namesNorm,
        foods, foodsNorm,
        brands, brandsNorm,
        screens, screensNorm,
      });

      setTimeout(() => setLoadPct(100), 150);
      setLoading(false);
    })();
  }, []);

  /* ===== Spec from server ===== */
  const [spec, setSpec] = useState<DailySpec | null>(null);
  const [serverStartedAt, setServerStartedAt] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>("");

  const [alreadyPlayed, setAlreadyPlayed] = useState<boolean>(false);

  const fetchStatus = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/daily/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j?.ok) {
          setAlreadyPlayed(!!j.todayPlayed);
          return;
        }
      }
    } catch {}
    const played = !!safeLS.get(LS.keyPlayed(id));
    setAlreadyPlayed(played);
  }, []);

  const fetchSpec = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/daily/today", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.message || "Failed to fetch daily spec.");
      setSpec(j.spec as DailySpec);
      setServerStartedAt(j.startedAt as number | undefined);
      if (j.spec?.id) fetchStatus(j.spec.id);
    } catch (e: any) {
      setError(e?.message || "Could not load daily.");
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  /* ===== Client-normalized goals (6 total, exactly 1 letter: S) ===== */
  const clientGoals: DailyGoal[] = useMemo(
    () => normalizeGoals(spec?.goals ?? [], spec?.id),
    [spec?.goals, spec?.id]
  );

  /* ===== Allowed categories (derived from client goals) ===== */
  const allowedCats: Set<ChainKey> = useMemo(() => {
    const set = new Set<ChainKey>();
    for (const g of clientGoals) {
      if (g.kind === "category") set.add(g.cat);
    }
    return set;
  }, [clientGoals]);

  const allowedCatsList = useMemo(
    () => Array.from(allowedCats).map(c => CHAIN_COLORS[c].label).join(", "),
    [allowedCats]
  );
// app/daily/page.tsx — PART B

  /* ===== Local run state (Daily rules) ===== */
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [last, setLast] = useState<string>("start");
  const inputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [score, setScore] = useState(0);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [sameEnds, setSameEnds] = useState(0);
  const [maxChain, setMaxChain] = useState(0);
  const chainLenRef = useRef(0);
  const [catsCount, setCatsCount] = useState<Record<ChainKey, number>>({
    name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0,
  });

  // per-letter starts counter (for letter goals)
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});

  // multipliers (still for points)
  const [catMult, setCatMult] = useState<Record<ChainKey, number>>({
    name: 1, animal: 1, country: 1, food: 1, brand: 1, screen: 1,
  });
  const [sameMult, setSameMult] = useState(1);

  const totalMult = useMemo(() => {
    const sum =
      catMult.name +
      catMult.animal +
      catMult.country +
      catMult.food +
      catMult.brand +
      catMult.screen;
    return Math.max(1, sum) * sameMult;
  }, [catMult, sameMult]);

  // typing SFX throttle
  const lastTypeAt = useRef(0);
  const onTypeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length !== 1) return;
    const now = performance.now();
    if (now - lastTypeAt.current > 70) {
      safePlay("typing", { volume: 0.25 });
      lastTypeAt.current = now;
    }
  };

  // warning SFX at <= 10s
  const warningPlayingRef = useRef(false);
  useEffect(() => {
    if (!started) return;
    const danger = timeLeft > 0 && timeLeft <= 10;
    if (danger && !warningPlayingRef.current) {
      try { (play as any)("warning", { loop: true, volume: 0.5 }); warningPlayingRef.current = true; } catch {}
    }
    if ((!danger || timeLeft === 0) && warningPlayingRef.current) {
      try { (stop as any)("warning"); warningPlayingRef.current = false; } catch {}
    }
  }, [timeLeft, started, play, stop]);

  // timer
  useEffect(() => {
    if (!started) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [started]);

  // end on time up
  useEffect(() => {
    if (!started || timeLeft > 0) return;
    try { (stop as any)("warning"); warningPlayingRef.current = false; } catch {}
    endRun("Time's up!");
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetRun = useCallback(() => {
    setTimeLeft(spec?.timeSeconds ?? 120);
    setLast(spec?.starter || "start");
    setMsg("");
    setScore(0);
    setUsed(new Set());
    setRecent([]);
    setSameEnds(0);
    chainLenRef.current = 0;
    setMaxChain(0);
    setCatsCount({ name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0 });
    setCatMult({ name: 1, animal: 1, country: 1, food: 1, brand: 1, screen: 1 });
    setSameMult(1);
    setLetterCounts({});
  }, [spec]);

  const [showStats, setShowStats] = useState(false);
  const [endReason, setEndReason] = useState<string>("");

  const startDaily = () => {
    if (!spec) return;
    if (alreadyPlayed) {
      setMsg("You’ve already done today’s Daily.");
      try { vfx.shake(".start-card"); } catch {}
      return;
    }
    resetRun();
    setShowStats(false);
    setEndReason("");
    setStarted(true);
    try { vfx.confettiBurst({ power: 0.5 }); } catch {}
  };

  /* ===== Category detection & validation ===== */
  const isAnimal = (animals: Set<string>, w: string) => {
    if (animals.has(w)) return true;
    if (w.endsWith("es") && animals.has(w.slice(0, -2))) return true;
    if (w.endsWith("s") && animals.has(w.slice(0, -1))) return true;
    return false;
  };

  const getCategories = useCallback((w: string): Set<ChainKey> => {
    if (!data) return new Set();
    const set = new Set<ChainKey>();
    const lw = w.toLowerCase().trim();
    const nw = norm(w);
    const lwSing = singularize(lw);
    const nwSing = singularize(nw);
    const brandForm = norm(stripCorpSuffixes(w));

    if (data.countries.has(lw) || data.countriesNorm.has(nw)) set.add("country");
    if (isAnimal(data.animals, lw) || data.animalsNorm.has(nw)) set.add("animal");
    if (data.names.has(lw) || data.namesNorm.has(nw)) set.add("name");
    if (data.foods.has(lw) || data.foodsNorm.has(nw) || data.foods.has(lwSing) || data.foodsNorm.has(nwSing)) set.add("food");
    if (data.brands.has(lw) || data.brandsNorm.has(nw) || data.brandsNorm.has(brandForm)) set.add("brand");
    if (data.screens.has(lw) || data.screensNorm.has(nw)) set.add("screen");

    return set;
  }, [data]);

  const validateWord = useCallback(async (w: string): Promise<{ ok: boolean; reason?: string; cats?: Set<ChainKey> }> => {
    if (!data) return { ok: false, reason: "Data not ready" };
    if (!INPUT_RE.test(w)) return { ok: false, reason: "Format" };

    const lw = w.toLowerCase().trim();
    const lwSing = singularize(lw);
    const nw = norm(w);
    const nwSing = singularize(nw);
    const brandForm = norm(stripCorpSuffixes(w));

    let dictionaryOk =
      data.dict.has(lw) || data.dictNorm.has(nw) ||
      data.countries.has(lw) || data.countriesNorm.has(nw) ||
      data.names.has(lw) || data.namesNorm.has(nw) ||
      isAnimal(data.animals, lw) || data.animalsNorm.has(nw) ||
      data.screens.has(lw) || data.screensNorm.has(nw) ||
      data.foods.has(lw) || data.foodsNorm.has(nw) || data.foods.has(lwSing) || data.foodsNorm.has(nwSing) ||
      data.brands.has(lw) || data.brandsNorm.has(nw) || data.brandsNorm.has(brandForm);

    if (!dictionaryOk) return { ok: false, reason: "Not in datasets" };

    const cats = getCategories(w);
    if (allowedCats.size > 0) {
      const intersects = Array.from(cats).some(c => allowedCats.has(c));
      if (!intersects) {
        return { ok: false, reason: "Not in allowed categories", cats };
      }
    }
    return { ok: true, cats };
  }, [data, allowedCats, getCategories]);

  /* ===== Hidden words state ===== */
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [usedHidden, setUsedHidden] = useState<Set<string>>(new Set()); // lower-cased

  // local helper (Fisher–Yates using seeded RNG)
  const shuffleArray = <T,>(arr: T[], rnd: () => number) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ===== Hidden words generation (one per today's categories) ===== */
  useEffect(() => {
    if (!data || !spec) return;

    const seedStr = spec.id || new Date().toISOString().slice(0, 10);
    const seed = xmur3(`wc_hidden_v3_${seedStr}`)();
    const rnd = mulberry32(seed);

    const allCats: ChainKey[] = ["country", "animal", "name", "food", "brand", "screen"];
    const todaysCats: ChainKey[] = allowedCats.size > 0 ? Array.from(allowedCats) : allCats;

   // Prefer shorter words (4–12) and only plain ASCII letters

  // Helper: allow only plain A–Z letters (no digits, no accents, no punctuation, no spaces)
const onlyPlainLetters = (w: string) => /^[A-Za-z]+$/.test(w);

// Prefer shorter words (4–12) and only plain ASCII letters
const toPool = (set: Set<string>) =>
  Array.from(set).filter(
    (w) => w.length >= 4 && w.length <= 12 && onlyPlainLetters(w)
  );



    const pools: Record<ChainKey, string[]> = {
      country: toPool(data.countries),
      animal:  toPool(data.animals),
      name:    toPool(data.names),
      food:    toPool(data.foods),
      brand:   toPool(data.brands),
      screen:  toPool(data.screens),
    };

    // choose up to three distinct categories from today's set.
    const distinctCats = shuffleArray(todaysCats, rnd).slice(0, Math.min(3, todaysCats.length));
    const chosenForThree: ChainKey[] = [];
    if (distinctCats.length >= 3) {
      chosenForThree.push(...distinctCats);
    } else if (distinctCats.length === 2) {
      const extra = distinctCats[Math.floor(rnd() * distinctCats.length)];
      chosenForThree.push(distinctCats[0], distinctCats[1], extra);
    } else {
      const base = distinctCats[0] ?? pickFrom(allCats, rnd);
      const backfill = shuffleArray(allCats, rnd).filter(c => c !== base).slice(0, 2);
      chosenForThree.push(base, ...backfill);
    }

    // pick one word per chosen category, with graceful fallbacks
    const picks: string[] = [];
    for (const cat of chosenForThree) {
      let candidate: string | undefined;

      const tryPick = (fromCats: ChainKey[]) => {
        for (const c of shuffleArray(fromCats, rnd)) {
          const pool = pools[c];
          if (!pool || pool.length === 0) continue;
          for (let k = 0; k < 8; k++) {
            const w = pickFrom(pool, rnd);
            if (w && !picks.includes(w) && noDigits(w)) {
              candidate = w;
              return;
            }
          }
        }
      };

      tryPick([cat]);
      if (!candidate && todaysCats.length) tryPick(todaysCats);
      if (!candidate) tryPick(allCats);
      if (candidate) picks.push(candidate);
    }

    setHiddenWords(picks.slice(0, 3));
  }, [data, spec, allowedCats]);

  /* ===== Filtered list & remaining (for UI) ===== */
  const hiddenWordsFiltered = useMemo(() => {
    // Defensive: also filter out any that might have digits
    const baseList = hiddenWords.filter(noDigits);
    if (allowedCats.size === 0) return baseList;
    return baseList.filter((w) => {
      const cats = getCategories(w);
      return Array.from(cats).some((c) => allowedCats.has(c));
    });
  }, [hiddenWords, allowedCats, getCategories]);

  const remainingHidden = useMemo(
    () => hiddenWordsFiltered.filter(w => !usedHidden.has(w.toLowerCase())),
    [hiddenWordsFiltered, usedHidden]
  );

  /* ===== Score SFX one-shots ===== */
  const SINGLE_WORD_SFX: Array<{ threshold: number; key: string }> = [
    { threshold: 800,   key: "word_1k" },
    { threshold: 1500,  key: "bigword" },
    { threshold: 3000,  key: "word_4k" },
    { threshold: 6000,  key: "word_8k" },
    { threshold: 10000, key: "word_15k" },
  ];
  const playedSingleWordKeysRef = useRef<Set<string>>(new Set());
  const playSingleWordOneShot = useCallback((points: number) => {
    let best: { threshold: number; key: string } | undefined;
    for (const t of SINGLE_WORD_SFX) {
      if (points >= t.threshold) {
        if (!best || t.threshold > best.threshold) best = t;
      }
    }
    if (!best) return;
    if (playedSingleWordKeysRef.current.has(best.key)) return;
    playedSingleWordKeysRef.current.add(best.key);
    try { (safePlay as any)(best.key); } catch {}
  }, [safePlay]);

  const TOTAL_SCORE_SFX: Array<{ threshold: number; key: string } > = [
    { threshold: 5_000,  key: "total_10k" },
    { threshold: 20_000, key: "total_50k" },
    { threshold: 50_000, key: "total_100k" },
  ];
  const playedTotalMilestonesRef = useRef<Set<number>>(new Set());
  const playTotalMilestoneOnce = useCallback((totalAfter: number) => {
    const hits = TOTAL_SCORE_SFX.filter(t => totalAfter >= t.threshold && !playedTotalMilestonesRef.current.has(t.threshold));
    if (!hits.length) return;
    const top = hits.reduce((a, b) => (a.threshold > b.threshold ? a : b));
    for (const t of TOTAL_SCORE_SFX) {
      if (t.threshold <= top.threshold) playedTotalMilestonesRef.current.add(t.threshold);
    }
    try { (safePlay as any)(top.key); } catch {}
  }, [safePlay]);

  /* ===== Accept a word (typed or helper) ===== */
  const applyAcceptedWord = useCallback((w: string) => {
    const wl = w.toLowerCase();

    // progress chain
    chainLenRef.current += 1;
    if (chainLenRef.current > maxChain) setMaxChain(chainLenRef.current);

    const same = w[0].toLowerCase() === w[w.length - 1].toLowerCase();
    if (same) setSameEnds(x => x + 1);
    setSameMult(s => (same ? 1 + (s - 1) + 0.2 : 1));

    const cats = getCategories(w);

    // bump category multipliers & counts
    setCatMult(m => {
      const nx = { ...m };
      (["name","animal","country","food","brand","screen"] as ChainKey[]).forEach(k => {
        if (cats.has(k)) nx[k] = Math.max(1, nx[k] + 0.3);
      });
      return nx;
    });
    setCatsCount(cc => {
      const nx = { ...cc };
      cats.forEach(k => nx[k] = nx[k] + 1);
      return nx;
    });

    // letter starts bookkeeping
    const startL = w[0].toLowerCase();
    setLetterCounts(lc => ({ ...lc, [startL]: (lc[startL] || 0) + 1 }));

    // base score uses best category base (or normal)
    const catsArr = Array.from(cats);
    const base = catsArr.length
      ? Math.max(...catsArr.map(k => CHAIN_BASE[k]))
      : CHAIN_BASE.normal;

    const gained = Math.round(w.length * base * totalMult);
    playSingleWordOneShot(gained);

    setScore(prev => {
      const sum = prev + gained;
      playTotalMilestoneOnce(sum);
      return sum;
    });

    setMsg(`+${gained} points (total ${fmt(totalMult)})`);
    try { safePlay("accept"); } catch {}
    try {
      const el = inputRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        vfx.ringBurstAt(r.left + r.width / 2, r.top + r.height / 2);
        vfx.glowOnce(el);
      } else {
        vfx.ringBurstAtFromEl("input[name='word']");
      }
    } catch {}

    setUsed(u => new Set(u).add(wl));
    setRecent(r => [w, ...r].slice(0, 30));
    setLast(w);
  }, [getCategories, totalMult, vfx, safePlay, playSingleWordOneShot, playTotalMilestoneOnce, maxChain]);

  /* ===== SAFE WORD click (ANYTIME; bypass chain-letter rule) ===== */
  const tryUseHiddenWord = useCallback(async (w: string) => {
    if (!noDigits(w)) {
      // Defensive guard: never allow a SAFE WORD with digits
      setMsg("SAFE WORDs never contain numbers.");
      try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
      try { safePlay("used"); } catch {}
      return;
    }

    const wl = w.toLowerCase();
    if (usedHidden.has(wl)) return;

    // Only validate dictionary + allowed categories
    const res = await validateWord(w);
    if (!res.ok) {
      try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
      if (res.reason === "Not in allowed categories" && allowedCats.size > 0) {
        setMsg(`“${w}” doesn't count today (only ${allowedCatsList}).`);
      } else if (res.reason === "Format") {
        setMsg(`“${w}” has invalid format.`);
      } else {
        setMsg(`“${w}” isn't an official word.`);
      }
      try { safePlay("used"); } catch {}
      return;
    }

    // Accept and award bonus (no chain constraints)
    applyAcceptedWord(w);
    setUsedHidden(prev => new Set(prev).add(wl));
    setScore(prev => {
      const sum = prev + HIDDEN_WORD_BONUS;
      playTotalMilestoneOnce(sum);
      return sum;
    });
    setMsg(`+${HIDDEN_WORD_BONUS.toLocaleString()} SAFE WORD bonus!`);
    try { safePlay("coin"); } catch {}
    try { vfx.confettiBurst({ power: 0.8 }); } catch {}
  }, [usedHidden, validateWord, allowedCats.size, allowedCatsList, applyAcceptedWord, vfx, safePlay, playTotalMilestoneOnce]);

  /* ===== Goals progress ===== */
  const goalState = useMemo(() => {
    const goals = clientGoals;
    return goals.map((g) => {
      let current = 0, target = 1, label = "", met = false;

      if (g.kind === "category") {
        current = catsCount[g.cat as ChainKey] ?? 0;
        target = g.count;
        label = `${safeLabelForCat(g.cat)} ≥ ${g.count}`;
        met = current >= target;
      } else if (g.kind === "trick") {
        if (g.trick === "sameEnds") { current = sameEnds; target = g.count; label = `Same-Ends ≥ ${g.count}`; met = current >= target; }
        else { current = maxChain; target = g.count; label = `Chain Length ≥ ${g.count}`; met = current >= target; }
      } else if (g.kind === "letter") {
        const L = (g.letter || "").toLowerCase();
        current = letterCounts[L] || 0;
        target = Math.max(1, g.count || 1);
        label = `Start with “${(g.letter || "").toUpperCase()}” ≥ ${target}`;
        met = current >= target;
      }

      const pct = Math.max(0, Math.min(100, Math.floor((current / target) * 100)));
      return { label, current, target, pct, met };
    });
  }, [clientGoals, catsCount, sameEnds, maxChain, letterCounts]);

  const allGoalsMet = goalState.length > 0 && goalState.every(g => g.met);

  // End when all goals met
  const didEndOnGoalsRef = useRef(false);
  useEffect(() => {
    if (!started || !allGoalsMet || didEndOnGoalsRef.current) return;
    didEndOnGoalsRef.current = true;
    endRun("All goals completed!");
  }, [allGoalsMet, started]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tiny "goal completed" effect once per flip
  const prevMetRef = useRef<boolean[]>([]);
  useEffect(() => {
    if (!started || clientGoals.length === 0) return;
    const nowMet = goalState.map(g => g.met);
    const prev = prevMetRef.current;
    for (let i = 0; i < nowMet.length; i++) {
      if (nowMet[i] && !prev[i]) {
        try { safePlay("coin"); } catch {}
        try { vfx.confettiBurst({ power: 0.6 }); } catch {}
      }
    }
    prevMetRef.current = nowMet;
  }, [goalState, started, clientGoals.length, safePlay, vfx]);

  const submitDaily = useCallback(async (reason?: string) => {
    if (!spec) return;

    try {
      const res = await fetch("/api/daily/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: spec.id,
          score,
          wordsPlayed: recent.slice().reverse(),
          catsCount,
          sameEnds,
          maxChain,
          startedAt: serverStartedAt,
          specSig: spec.signature,
          completedAll: allGoalsMet,
        }),
      });

      const j = await res.json();

      if (!res.ok || !j?.ok) {
        setMsg(j?.message || "Submit failed.");
        // Fall back to stats screen if we can't route
        setShowStats(true);
        setEndReason(reason || "");
        return;
      }

      const didClear: boolean = !!j.fullClear;

      if (didClear && j.awardedPiece) {
        try {
          window.dispatchEvent(new CustomEvent("wc:pieces:delta", { detail: { delta: 1 } }));
        } catch {}
      }

      if (didClear || allGoalsMet) {
        try { safePlay("mission"); } catch {}
        try { vfx.confettiBurst({ power: 1.2 }); } catch {}
      }

      if (j.alreadyPlayed) setAlreadyPlayed(true);

      if (didClear) {
        const delta = j.awardedPiece ? 1 : 0;
        router.push(`/daily/success?id=${encodeURIComponent(spec.id)}&score=${encodeURIComponent(String(score))}&delta=${delta}&awarded=0`);
        return;
      } else {
        router.push(`/daily/failure?id=${encodeURIComponent(spec.id)}&score=${encodeURIComponent(String(score))}`);
        return;
      }
    } catch {
      setMsg("Could not submit right now.");
      setShowStats(true);
      setEndReason(reason || "");
    }
  }, [spec, score, catsCount, sameEnds, maxChain, recent, serverStartedAt, safePlay, vfx, allGoalsMet, router]);

  const endRun = useCallback((reason: string) => {
    setStarted(false);
    try { (stop as any)("warning"); warningPlayingRef.current = false; } catch {}
    try { safePlay("gameover"); } catch {}
    submitDaily(reason);
  }, [submitDaily, stop, safePlay]);

  /* ===== Form submit (typed words; enforces chain rule) ===== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !spec) return;
    const el = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (el?.value || "").trim();
    if (!raw) return;
    el.value = "";

    const w = raw;
    const wl = w.toLowerCase();

    if (used.has(wl)) {
      setMsg("Already used.");
      try { safePlay("used"); } catch {}
      try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
      return;
    }

    // Chain-letter constraints for TYPED words only
    if (last !== "start") {
      if (firstLetter(wl) !== lastLetter(last).toLowerCase()) {
        try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
        setMsg(`Invalid: Must start with “${lastLetter(last).toLowerCase()}”.`);
        return;
      }
      if (!wl.includes(firstLetter(last).toLowerCase())) {
        try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
        setMsg(`Invalid: Must include “${firstLetter(last).toLowerCase()}”.`);
        return;
      }
    }

    const res = await validateWord(w);
    if (!res.ok) {
      try { vfx.shake(inputRef.current || "input[name='word']"); } catch {}
      if (res.reason === "Not in allowed categories" && allowedCats.size > 0) {
        setMsg(`Invalid: Only ${allowedCatsList} count today.`);
      } else if (res.reason === "Format") {
        setMsg("Invalid format.");
      } else {
        setMsg("Invalid: Not an official word.");
      }
      try { safePlay("used"); } catch {}
      return;
    }

    // Accept typed word
    applyAcceptedWord(w);

    // If the typed word is also a SAFE WORD, add the bonus
    if (hiddenWordsFiltered.some(hw => hw.toLowerCase() === wl) && !usedHidden.has(wl)) {
      setUsedHidden(prev => new Set(prev).add(wl));
      setScore(prev => {
        const sum = prev + HIDDEN_WORD_BONUS;
        playTotalMilestoneOnce(sum);
        return sum;
      });
      setMsg(`+${HIDDEN_WORD_BONUS.toLocaleString()} SAFE WORD bonus!`);
      try { safePlay("coin"); } catch {}
      try { vfx.confettiBurst({ power: 0.8 }); } catch {}
    }
  };

  /* ===== Share helpers ===== */
  const buildShareText = () => {
    if (!spec) return "";
    const bestWord = recent[0] || "-";
    const lines = [
      `Word Chains — Daily ${spec.id} ${allGoalsMet ? "✅" : "—"}`,
      `Score ${score.toLocaleString()} | Best "${bestWord}"`,
      ...goalState.map(c => (c.met ? "✅ " : "▫️ ") + c.label),
      "",
      "Can you beat the daily puzzle?",
      "https://yourgame.link",
    ];
    return lines.join("\n");
  };

  const shareDaily = async () => {
    const text = buildShareText();
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ text, title: "Word Chains — Daily" });
      } else {
        await navigator.clipboard.writeText(text);
        setMsg("Copied results to clipboard.");
      }
      try { safePlay("coin"); } catch {}
    } catch {
      setMsg("Share failed — you can still copy the text below.");
    }
  };

  /* ===== UI ===== */
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <LoadingBar pct={loadPct} label="Loading dictionary…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="card p-6 text-rose-700 dark:text-rose-300">
          Failed to load: {error}
          <div className="mt-3">
            <button className="btn btn-primary btn-sm" onClick={fetchSpec}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const showRestrictionHint = allowedCats.size > 0;
  const validBannerText = `Valid today: ${allowedCatsList}`;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Daily Puzzle</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>
        </div>
      </div>

      {!spec ? (
        <div className="card p-6">Loading today’s puzzle…</div>
      ) : (
        <>
          {/* START CARD */}
          {!started && !showStats && (
            <div className="start-card card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Daily ID: <b>{spec.id}</b></div>
                  <div>Starter: <b>{spec.starter}</b></div>
                  <div>Time: <b>{spec.timeSeconds}s</b></div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Today’s Goals</h3>
                <GoalGrid goals={clientGoals} state={goalState} />
              </div>

              {showRestrictionHint && <ValidBanner text={validBannerText} />}

              <div className="text-xs text-gray-600 dark:text-gray-400">
                Rules: Next word must start with the previous last letter and include the previous first letter somewhere.
                (SAFE WORD buttons ignore this rule during play.)
              </div>

              {!isSignedIn && (
                <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  Sign in to collect puzzle pieces.
                  <button className="ml-2 underline" onClick={() => signIn("google")}>Sign in with Google</button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-primary" onClick={startDaily} disabled={!data || alreadyPlayed}>
                  {alreadyPlayed ? "Already Played" : "Start"}
                </button>
                <button className="btn" onClick={fetchSpec}>Refresh Daily</button>
                {alreadyPlayed && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">Come back tomorrow 👋</span>
                )}
              </div>
              {/* Message area: light stays rose, dark switches to emerald */}
              <div className="min-h-5 text-rose-600 dark:text-emerald-300">{msg}</div>
            </div>
          )}

          {/* GAME UI */}
          {started && (
            <div className="grid gap-4 md:grid-cols-3">
              {/* HUD left */}
              <div className="card p-4 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-lg">Score: <b>{score.toLocaleString()}</b></div>
                  <div className="text-sm">Multiplier: <b>{fmt(totalMult)}</b></div>
                </div>

                {/* Timer bar */}
                <div className="w-full h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden" aria-label="time remaining">
                  <div
                    className="h-2 bg-black/70 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (timeLeft / (spec.timeSeconds || 120)) * 100))}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Left: {timeLeft}s</div>

                {/* Goals row */}
                <GoalGrid goals={clientGoals} state={goalState} />

                {/* Restriction hint (prominent) */}
                {showRestrictionHint && <ValidBanner text={validBannerText} />}

                {/* Last word above input */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Last word: <b className="break-words">{last === "start" ? spec.starter : last}</b>
                </div>

                {/* Input */}
                <form onSubmit={onSubmit} className="mt-2 flex gap-2">
                  <input
                    ref={inputRef}
                    name="word"
                    placeholder={last === "start"
                      ? (showRestrictionHint
                          ? `Start anywhere (starter: “${spec.starter}”) · Only ${allowedCatsList}`
                          : `Start anywhere (starter: “${spec.starter}”)`)
                      : `Must start “${lastLetter(last).toLowerCase()}” & include “${firstLetter(last).toLowerCase()}”${showRestrictionHint ? ` · Only ${allowedCatsList}` : ""}`}
                    className="flex-1 rounded-xl border px-3 py-3
                               bg-white text-gray-900 placeholder-gray-500 border-gray-300
                               focus:outline-none focus:ring-2 focus:ring-black focus:border-black
                               dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700
                               dark:focus:ring-white dark:focus:border-gray-500"
                    autoFocus
                    onKeyDown={onTypeKey}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="btn btn-primary">Submit</button>
                </form>

                {/* Message area */}
                <div className="min-h-6 text-rose-600 dark:text-emerald-300">{msg}</div>

                {/* Recent */}
                <div>
                  <h3 className="font-semibold">Recent Words</h3>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {recent.map((w, i) => {
                      const cats = Array.from(getCategories(w));
                      return (
                        <div key={w + i} className="rounded border border-gray-200 dark:border-gray-700 p-2 text-sm bg-white dark:bg-gray-900">
                          <div className="font-medium break-words">{w}</div>
                          {cats.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {cats.map((c) => {
                                const color = CHAIN_COLORS[c as ChainKey] ?? CHAIN_COLORS.main;
                                return (
                                  <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] ${color.badge} ${color.text}`}>
                                    {safeLabelForCat(c)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Control row */}
                <div className="flex items-center gap-2 pt-2">
                  <button className="btn" onClick={() => endRun("Ended early.")}>End</button>
                  <button className="btn btn-ghost" onClick={shareDaily}>Share</button>
                </div>
              </div>

              {/* Right column: SAFE WORD buttons (only during play) */}
              <div className="card p-4 space-y-3">
                {remainingHidden.length > 0 && (
                  <div>
                    <div className="mb-1 text-sm font-semibold">SAFE WORDS (+{HIDDEN_WORD_BONUS.toLocaleString()} each)</div>
                    <div className="flex flex-col gap-2">
                      {remainingHidden.map((w) => {
                        const cats = Array.from(getCategories(w));
                        const c = cats[0] as ChainKey | undefined;
                        const color = c ? CHAIN_COLORS[c] : CHAIN_COLORS.main;
                        return (
                          <button
                            key={w}
                            className={[
                              "justify-between text-left rounded border px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/30",
                              color.border
                            ].join(" ")}
                            onClick={() => tryUseHiddenWord(w)}
                            title={`Use SAFE WORD (${safeLabelForCat(c)}) now`}
                            aria-label={`Use SAFE WORD for ${safeLabelForCat(c)}`}
                          >
                            <span className="font-semibold">SAFE WORD</span>
                            <span className={`ml-2 text-xs ${color.text}`}>({safeLabelForCat(c)})</span>
                          </button>
                        );
                      })}
                    </div>
                    {usedHidden.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Used: {[...usedHidden].join(", ")}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div>Daily ID: <b>{spec.id}</b></div>
                  <div>Starter: <b>{spec.starter}</b></div>
                  <div>Same-Ends: <b>{sameEnds}</b></div>
                  <div>Max Chain: <b>{maxChain}</b></div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Powerups/Lives/Links are disabled in Daily for simplicity.
                </div>
              </div>
            </div>
          )}

          {/* STATS SCREEN (post-run) — fallback if navigation fails */}
          {!started && showStats && spec && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Daily Stats</h2>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Goals</h3>
                <GoalGrid goals={clientGoals} state={goalState} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                  <div className="text-2xl font-semibold">{score.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Max Chain</div>
                  <div className="text-2xl font-semibold">{maxChain}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Same-Ends</div>
                  <div className="text-2xl font-semibold">{sameEnds}</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div>Daily ID: <b>{spec.id}</b></div>
                    <div>Result: <b>{allGoalsMet ? "Completed 🎉" : "Ended"}</b>{endReason ? ` — ${endReason}` : ""}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={shareDaily}>Share Results</button>
                </div>
                <textarea
                  className="mt-2 w-full rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-900"
                  rows={5}
                  readOnly
                  value={buildShareText()}
                />
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">Catchphrase included: “Can you beat the daily puzzle?”</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-primary" disabled>
                  Come back tomorrow
                </button>
                <Link href="/leaderboard" className="btn">Leaderboard</Link>
                {!isSignedIn && (
                  <button className="btn" onClick={() => signIn("google")}>Sign in to collect pieces</button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Local styles */}
      <style jsx global>{`
        .card { @apply rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-white/5 shadow-sm backdrop-blur; }
        .btn { @apply rounded-xl px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition; }
        .btn-primary { @apply border-black bg-black text-white hover:bg-black/90; }
        .btn-ghost { @apply border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800; }
      `}</style>
    </div>
  );
}

/* ===== Goals grid ===== */
function GoalGrid({
  goals,
  state,
}: {
  goals: DailyGoal[];
  state: Array<{ label: string; current: number; target: number; pct: number; met: boolean }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {goals.map((g, i) => {
        const s = state[i];
        if (!s) return null;

        const isLetter = (g as any).kind === "letter";
        const badge =
          g.kind === "category"
            ? CHAIN_COLORS[(g as any).cat as ChainKey]
            : CHAIN_COLORS.main;

        return (
          <div
            key={i}
            className={[
              "relative rounded-lg border p-2 text-sm overflow-hidden",
              s.met
                ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 opacity-90"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            ].join(" ")}
          >
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-300 ${s.met ? "bg-emerald-200/60 dark:bg-emerald-700/30" : "bg-gray-200/60 dark:bg-gray-700/30"}`}
              style={{ width: `${s.pct}%` }}
              aria-hidden
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="truncate">
                {isLetter ? (
                  <>
                    <span className={`px-1.5 py-0.5 rounded ${badge.badge} ${badge.text} mr-1`}>
                      {(g as any).letter?.toUpperCase()}
                    </span>
                    {s.label}
                  </>
                ) : (
                  s.label
                )}
              </span>
              <span className="ml-2">{s.met ? "🟩" : "⬜"}</span>
            </div>
            <div className="relative z-10 mt-1 text-[11px] text-gray-700 dark:text-gray-300 tabular-nums">
              {Math.min(s.current, s.target)} / {s.target}
            </div>
          </div>
        );
      })}
    </div>
  );
}
