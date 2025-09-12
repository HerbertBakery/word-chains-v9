"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ===== SFX + VFX hooks (non-breaking) ===== */
import { useSound } from "@/app/hooks/useSound";
import { useVFX } from "@/app/hooks/useVFX";

/** ===================== Types & constants ===================== */
type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";
type ChainKeyOrMain = ChainKey | "main";
type ChainState = { length: number; multiplier: number; frozen: boolean };
type PowerKey = ChainKey | "same";

const CHAIN_BASE = {
  normal: 1,
  name: 2,
  animal: 3,
  country: 5,
  food: 2.5,
  brand: 2.0,
  screen: 2.0, // TV & Movies
} as const;

const CHAIN_STEP_GROWTH = 0.3;
const SAME_LETTER_GROWTH = 0.2;

const lastLetter = (w: string) => w[w.length - 1];
const firstLetter = (w: string) => w[0];
const fmt = (x: number) => `x${x.toFixed(2)}`;

/** ===================== Normalization helpers ===================== */
const INPUT_RE = /^[a-zA-Z][a-zA-Z\s'\-&.]*$/;
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

function isAnimal(animals: Set<string>, w: string) {
  if (animals.has(w)) return true;
  if (w.endsWith("es") && animals.has(w.slice(0, -2))) return true;
  if (w.endsWith("s") && animals.has(w.slice(0, -1))) return true;
  return false;
}

/** Colors & labels */
const CHAIN_COLORS: Record<
  ChainKeyOrMain,
  { badge: string; border: string; text: string; label: string; solid: string }
> = {
  main:   { badge: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-800",   label: "Main",      solid: "bg-gray-200" },
  name:   { badge: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-800",   label: "Names",     solid: "bg-blue-100" },
  animal: { badge: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  label: "Animals",   solid: "bg-green-100" },
  country:{ badge: "bg-purple-100", border: "border-purple-400", text: "text-purple-800", label: "Countries", solid: "bg-purple-100" },
  food:   { badge: "bg-amber-100",  border: "border-amber-400",  text: "text-amber-900",  label: "Foods",     solid: "bg-amber-100" },
  brand:  { badge: "bg-rose-100",   border: "border-rose-400",   text: "text-rose-800",   label: "Brands",    solid: "bg-rose-100" },
  screen: { badge: "bg-teal-100",   border: "border-teal-400",   text: "text-teal-900",   label: "TV/Movies", solid: "bg-teal-100" },
};

/** Stable incremental ID generator */
const newId = (() => { let i = 0; return () => `m-${++i}`; })();

// --- helper: send a finished run to the leaderboard DB (auth required) ---
async function postRunToLeaderboard(summary: {
  bestScore: number;
  longestChain?: number;
  highestMultiplier?: number;
  totalWords?: number;
  uniqueWords?: number;
  animals?: number;
  countries?: number;
  names?: number;
  sameLetterWords?: number;
  switches?: number;
  linksEarned?: number;
  linksSpent?: number;
}) {
  try {
    const res = await fetch("/api/stats/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(summary),
      keepalive: true,
    });
    if (res.status === 401) return { ok: false, status: 401, msg: "Sign in to save your score." };
    if (!res.ok)    return { ok: false, status: res.status, msg: `Save failed (HTTP ${res.status}).` };
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, status: 0, msg: "Network error saving score." };
  }
}

/** ===================== Component ===================== */
export default function WordChains() {
  /* ===== SFX/VFX instances + element refs (non-invasive) ===== */
  const sound = useSound();
  const play = sound.play;
  const stop: (...args: any[]) => void =
    (sound as any).stop?.bind(sound) ?? ((..._args: any[]) => {});

  const vfx = useVFX();
  const inputDomRef = useRef<HTMLInputElement>(null);
  const lowWarnTickRef = useRef<number | null>(null); // to avoid spamming warning sfx
  const timeoutLatchRef = useRef(false);              // prevent double timeouts
  const warningPlayingRef = useRef(false);            // track heartbeat state

  // Latches that mirror started/paused without stale closures.
  const startedRef = useRef(false);
  const pausedRef  = useRef(false);

  // ---- SAFARI-SAFE, NON-BLOCKING SOUND WRAPPER (surgical) ----
  const safePlay = useCallback(
    (key: string, opts?: any) => {
      // If Safari/iOS hasn't unlocked audio yet, skip typing sfx to avoid first-key freeze
      if (key === "typing" && typeof window !== "undefined" && !(window as any).__sfx_unlocked) return;
      try {
        requestAnimationFrame(() => {
          try { play(key as any, opts); } catch {}
        });
      } catch {}
    },
    [play]
  );

  /** ===================== Data sets ===================== */
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [animals, setAnimals] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Set<string>>(new Set());
  const [foods, setFoods] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [screens, setScreens] = useState<Set<string>>(new Set());

  const [foodsNorm, setFoodsNorm] = useState<Set<string>>(new Set());
  const [brandsNorm, setBrandsNorm] = useState<Set<string>>(new Set());
  const [countriesNorm, setCountriesNorm] = useState<Set<string>>(new Set());
  const [namesNorm, setNamesNorm] = useState<Set<string>>(new Set());
  const [animalsNorm, setAnimalsNorm] = useState<Set<string>>(new Set());
  const [screensNorm, setScreensNorm] = useState<Set<string>>(new Set());
  const [dictNorm, setDictNorm] = useState<Set<string>>(new Set());

  const [strictDictionary, setStrictDictionary] = useState(true);

  useEffect(() => {
    (async () => {
      const get = async (url: string) => {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (!r.ok) return null;
          const j = await r.json();
          const arr = Array.isArray(j) ? j : null;
          if (!arr) return null;
          const out = arr
            .map((x: any) => (typeof x === "string" ? x : x?.name))
            .filter(Boolean)
            .map((x: string) => x.trim());
          return out;
        } catch {
          return null;
        }
      };

      const [d, a, c, n, f, b, s] = await Promise.all([
        get("/wordchains/dictionary.json"),
        get("/wordchains/animals.json"),
        get("/wordchains/countries.json"),
        get("/wordchains/names.json"),
        get("/wordchains/foods.json"),
        get("/wordchains/brands.json"),
        get("/wordchains/screen.json"),
      ]);

      // raw
      setDict(new Set((d ?? []).map((x) => x.toLowerCase())));
      setAnimals(new Set((a ?? []).map((x) => x.toLowerCase())));
      setCountries(new Set((c ?? []).map((x) => x.toLowerCase())));
      setNames(new Set((n ?? []).map((x) => x.toLowerCase())));
      setFoods(new Set((f ?? []).map((x) => x.toLowerCase())));
      setBrands(new Set((b ?? []).map((x) => x.toLowerCase())));
      setScreens(new Set((s ?? []).map((x) => x.toLowerCase())));

      // normalized
      setDictNorm(new Set((d ?? []).map((x) => norm(String(x)))));
      setAnimalsNorm(new Set((a ?? []).map((x) => norm(String(x)))));
      setCountriesNorm(new Set((c ?? []).map((x) => norm(String(x)))));
      setNamesNorm(new Set((n ?? []).map((x) => norm(String(x)))));
      setFoodsNorm(new Set((f ?? []).map((x) => norm(String(x)))));
      setBrandsNorm(new Set((b ?? []).map((x) => norm(stripCorpSuffixes(String(x))))));
      setScreensNorm(new Set((s ?? []).map((x) => norm(String(x)))));

      console.log("[wordchains] loaded counts", {
        dict: (d ?? []).length,
        animals: (a ?? []).length,
        countries: (c ?? []).length,
        names: (n ?? []).length,
        foods: (f ?? []).length,
        brands: (b ?? []).length,
        screen: (s ?? []).length,
      });
    })();
  }, []);

  /** ===================== Core game state ===================== */
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  // keep refs in sync with latest state
  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { pausedRef.current  = paused;  }, [paused]);

  const [last, setLast] = useState<string>("start");
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [links, setLinks] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Post game
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [playerName, setPlayerName] = useState("");

  // Stats (per-run counters – persisted after run)
  type Stats = {
    totalWords: number;
    animals: number;
    countries: number;
    names: number;
    sameLetterWords: number;
    longestAnimalStreak: number;
    longestCountryStreak: number;
    longestNameStreak: number;
    highestWordScore: number;
    switches: number;
    linksEarned: number;
    linksSpent: number;
    // optional enriched fields
    highestMultiplier?: number;
    longestChain?: number;
    uniqueWords?: number;
    totalSessions?: number;
  };
  const [stats, setStats] = useState<Stats>({
    totalWords: 0,
    animals: 0,
    countries: 0,
    names: 0,
    sameLetterWords: 0,
    longestAnimalStreak: 0,
    longestCountryStreak: 0,
    longestNameStreak: 0,
    highestWordScore: 0,
    switches: 0,
    linksEarned: 0,
    linksSpent: 0,
  });
  const persistStats = (s: Stats) => localStorage.setItem("wc_stats", JSON.stringify(s));

  const [sameMult, setSameMult] = useState(1);
  const [chains, setChains] = useState<Record<ChainKey, ChainState>>({
    name: { length: 0, multiplier: 1, frozen: false },
    animal: { length: 0, multiplier: 1, frozen: false },
    country: { length: 0, multiplier: 1, frozen: false },
    food: { length: 0, multiplier: 1, frozen: false },
    brand: { length: 0, multiplier: 1, frozen: false },
    screen: { length: 0, multiplier: 1, frozen: false },
  });

  /** ===================== Multiplier (with completion x10 bonuses) ===================== */
  const [completedTracks, setCompletedTracks] = useState<Set<ChainKeyOrMain>>(new Set());

  const totalMultData = useMemo(() => {
    // Sum of category multipliers (each starts at x1)
    const catSum =
      chains.name.multiplier +
      chains.animal.multiplier +
      chains.country.multiplier +
      chains.food.multiplier +
      chains.brand.multiplier +
      chains.screen.multiplier;

    // NEW: additive mission bonus → +10 per completed section (stacks)
    const tracksCompleted = completedTracks.size;
    const missionAdd = 10 * tracksCompleted;

    // Base + missions, then apply same-letter multiplier multiplicatively
    const basePlusMissions = Math.max(1, catSum) + missionAdd;
    const total = basePlusMissions * sameMult;

    return { total, catSum, missionAdd, basePlusMissions, tracksCompleted };
  }, [chains, sameMult, completedTracks]);

  const totalMult = totalMultData.total;

  /** ===================== Run analytics for stats page KPIs ===================== */
  const lastAcceptAtRef = useRef<number | null>(null);
  const deltasRef = useRef<number[]>([]);
  const peakTotalMultRef = useRef<number>(1);
  const currentChainRef = useRef<number>(0);
  const maxChainRef = useRef<number>(0);

  /** ===================== Power thresholds & state ===================== */
  const POWER_THRESHOLDS: Record<PowerKey, number> = {
    name: 10,
    animal: 10,
    country: 10,
    food: 5,
    brand: 5,
    screen: 10,
    same: 10,
  };

  /** ===================== Category detection ===================== */
  const getCategories = useCallback(
    (w: string): Set<ChainKey> => {
      const set = new Set<ChainKey>();
      const lw = w.toLowerCase().trim();
      const nw = norm(w);
      const lwSing = singularize(lw);
      const nwSing = singularize(nw);
      const brandForm = norm(stripCorpSuffixes(w));

      if (countries.has(lw) || countriesNorm.has(nw)) set.add("country");
      if (isAnimal(animals, lw) || animalsNorm.has(nw)) set.add("animal");
      if (names.has(lw) || namesNorm.has(nw)) set.add("name");

      if (foods.has(lw) || foodsNorm.has(nw) || foods.has(lwSing) || foodsNorm.has(nwSing)) set.add("food");
      if (brands.has(lw) || brandsNorm.has(nw) || brandsNorm.has(brandForm)) set.add("brand");
      if (screens.has(lw) || screensNorm.has(nw)) set.add("screen");

      return set;
    },
    [animals, animalsNorm, countries, countriesNorm, names, namesNorm, foods, foodsNorm, brands, brandsNorm, screens, screensNorm]
  );

  const [prevCats, setPrevCats] = useState<Set<ChainKey>>(new Set());

  /** ===================== Timer ===================== */
  useEffect(() => {
    if (!started || paused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started, paused]);

  useEffect(() => {
    if (!started) return;                 // only care while game is running
    if (timeLeft !== 0) {
      timeoutLatchRef.current = false;
      return;
    }
    if (timeoutLatchRef.current) return;
    timeoutLatchRef.current = true;

    try { (stop as any)("warning"); } catch {}
    warningPlayingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    loseLife("Time's up!");

    setTimeout(() => {
      if (!startedRef.current) return;
      setTimeLeft(30);
      if (!pausedRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
      }
      timeoutLatchRef.current = false;
    }, 0);
  }, [timeLeft, started, stop]);

  /* ===== Low-timer warning SFX (looping, single instance) ===== */
  useEffect(() => {
    const inDanger = started && !paused && timeLeft > 0 && timeLeft <= 5;

    if (inDanger && !warningPlayingRef.current) {
      try { (play as any)("warning", { loop: true, volume: 0.5 }); warningPlayingRef.current = true; } catch {}
    }

    if (!inDanger && warningPlayingRef.current) {
      try { (stop as any)("warning"); } catch {}
      warningPlayingRef.current = false;
    }
  }, [timeLeft, started, paused, play, stop]);

  // Additive multiplier bonuses
  const [nextWordAddBonus, setNextWordAddBonus] = useState(0);
  const [surgeActive, setSurgeActive] = useState(false);

  // Freeze-until-next-answer (Names)
  const [pauseUntilAnswer, setPauseUntilAnswer] = useState(false);
  const pauseUntilAnswerRef = useRef(false);
  useEffect(() => { pauseUntilAnswerRef.current = pauseUntilAnswer; }, [pauseUntilAnswer]);

  // Track peak *effective* multiplier (base total + additives)
  useEffect(() => {
    const eff = totalMult + (surgeActive ? 20 : 0) + nextWordAddBonus;
    if (eff > peakTotalMultRef.current) peakTotalMultRef.current = eff;
  }, [totalMult, surgeActive, nextWordAddBonus]);

  const playLifeLostTight = () => {
    const off = 0.06; // 60ms
    try { (play as any)("lifeLost", { seek: off, offset: off, startAt: off }); }
    catch { try { (play as any)("lifeLost"); } catch {} }
  };

  // Lose a life and handle game-over if no lives left
  const loseLife = (reason: string) => {
    setLives((l) => {
      const next = l - 1;

      try { (stop as any)("warning"); } catch {}
      if (typeof warningPlayingRef !== "undefined") warningPlayingRef.current = false;

      if (next <= 0) {
        endGame(reason);
        return 0;
      }

      setMsg(`${reason} (-1 life)`);
      try { playLifeLostTight(); } catch { try { (play as any)("lifeLost"); } catch {} }
      try { vfx.shake("#score", 400); } catch {}

      return next;
    });
  };

  const endGame = async (reason: string) => {
    setStarted(false);
    setMsg(`Game over: ${reason}`);
    setFinalScore(score);

    try { stop("warning"); } catch {}
    warningPlayingRef.current = false;

    try { safePlay("gameover"); } catch {}

    const gaps = deltasRef.current;
    const perRunAvgMs = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;

    try {
      const speeds = JSON.parse(localStorage.getItem("wc_session_speeds") || "[]");
      const speedsArr = Array.isArray(speeds) ? speeds : [];
      if (perRunAvgMs != null && isFinite(perRunAvgMs) && perRunAvgMs > 0) {
        speedsArr.push(perRunAvgMs);
      }
      localStorage.setItem("wc_session_speeds", JSON.stringify(speedsArr));

      const prevSessions = Number(localStorage.getItem("wc_total_sessions") || "0") || 0;
      localStorage.setItem("wc_total_sessions", String(prevSessions + 1));

      const peaks = JSON.parse(localStorage.getItem("wc_peak_multipliers") || "[]");
      const peaksArr = Array.isArray(peaks) ? peaks : [];
      const peakThisRun = Number(peakTotalMultRef.current) || 1;
      peaksArr.push(peakThisRun);
      localStorage.setItem("wc_peak_multipliers", JSON.stringify(peaksArr));
    } catch {}

    const uniqueWordsThisRun = used.size;
    const longestChainThisRun = maxChainRef.current || 0;
    const highestMultThisRun = Number((peakTotalMultRef.current || 1).toFixed(2));

    let prevLocal: any = {};
    try { prevLocal = JSON.parse(localStorage.getItem("wc_stats") || "{}") || {}; } catch {}

    const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const sessionsNow = num(localStorage.getItem("wc_total_sessions"));

    const mergedAllTime = {
      ...prevLocal,
      totalWords:        num(prevLocal.totalWords)        + num(stats.totalWords),
      animals:           num(prevLocal.animals)           + num(stats.animals),
      countries:         num(prevLocal.countries)         + num(stats.countries),
      names:             num(prevLocal.names)             + num(stats.names),
      sameLetterWords:   num(prevLocal.sameLetterWords)   + num(stats.sameLetterWords),
      switches:          num(prevLocal.switches)          + num(stats.switches),
      linksEarned:       num(prevLocal.linksEarned)       + num(stats.linksEarned),
      linksSpent:        num(prevLocal.linksSpent)        + num(stats.linksSpent),
      highestWordScore:    Math.max(num(prevLocal.highestWordScore),    num(stats.highestWordScore)),
      longestAnimalStreak: Math.max(num(prevLocal.longestAnimalStreak), num(stats.longestAnimalStreak)),
      longestCountryStreak:Math.max(num(prevLocal.longestCountryStreak),num(stats.longestCountryStreak)),
      longestNameStreak:   Math.max(num(prevLocal.longestNameStreak),   num(stats.longestNameStreak)),
      longestChain:        Math.max(num(prevLocal.longestChain),         num(longestChainThisRun), num(stats.longestChain)),
      highestMultiplier:   Math.max(num(prevLocal.highestMultiplier),    num(highestMultThisRun)),
      totalSessions: sessionsNow,
      uniqueWords:   Math.max(num(prevLocal.uniqueWords), num(uniqueWordsThisRun)),
    };

    persistStats(mergedAllTime);

    const summary = {
      bestScore: Number(score) || 0,
      longestChain: Number(longestChainThisRun || 0),
      highestMultiplier: Number(highestMultThisRun || 0),
      totalWords: Number(stats.totalWords ?? 0),
      uniqueWords: Number(uniqueWordsThisRun || 0),
      animals: Number(stats.animals ?? 0),
      countries: Number(stats.countries ?? 0),
      names: Number(stats.names ?? 0),
      sameLetterWords: Number(stats.sameLetterWords ?? 0),
      switches: Number(stats.switches ?? 0),
      linksEarned: Number(stats.linksEarned ?? 0),
      linksSpent: Number(stats.linksSpent ?? 0),
    };
    const result = await postRunToLeaderboard(summary);

    if (!result.ok) {
      if (result.status === 401) setMsg("Sign in with Google to save your score to the global leaderboard.");
      else setMsg(result.msg || "Could not save score right now.");
      setShowNamePrompt(true);
    } else {
      setShowNamePrompt(false);
      setPlayerName("");
    }
  };

  const submitScore = async () => {
    const name = playerName.trim() || "Anonymous";
    try {
      await fetch("/api/wordchains/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score: finalScore }),
      });
      setMsg(`Thanks, ${name}! Your score (${finalScore}) is on the board.`);
    } catch {
      setMsg("Could not submit score right now.");
    } finally {
      setShowNamePrompt(false);
      setPlayerName("");
    }
  };

  const pickStarter = useCallback(() => {
    if (!dict) return "start";
    const arr = Array.from(dict);
    for (let i = 0; i < 500; i++) {
      const c = arr[Math.floor(Math.random() * arr.length)];
      if (c.length >= 4 && c.length <= 7) return c;
    }
    return "start";
  }, [dict]);

  /** ===================== Missions ===================== */
  type MissionKindCat = "enterChain" | "reachMult" | "combo" | "scoreWord" | "validWords";
  type MissionKindMain = "reachSame" | "totalScore" | "sequence";

  type Mission =
    | { id: string; owner: ChainKey; chain: ChainKey; kind: MissionKindCat; target: number; progress: number; reward: number }
    | { id: string; owner: "main"; chain: "main"; kind: Exclude<MissionKindMain, "sequence">; target: number; progress: number; reward: number }
    | { id: string; owner: "main"; chain: "main"; kind: "sequence"; sequence: ChainKey[]; progress: number; reward: number };

  const buildCategoryTrack = (chain: ChainKey): Mission[] => {
    const R = 1;
    return [
      { id: newId(), owner: chain, chain, kind: "enterChain", target: 1,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo",      target: 2,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult",  target: 2.0, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "scoreWord",  target: 500, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo",      target: 3,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult",  target: 4.0, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "scoreWord",  target: 2000, progress: 0, reward: R },
    ];
  };

  const buildMainTrack = (): Mission[] => {
    const R = 1;
    return [
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 250,  progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 1000, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 1.5,  progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 3.0,  progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 5000, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 5.0,  progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 10000,progress: 0, reward: R },
    ];
  };

  const missionTracks: Record<ChainKeyOrMain, Mission[]> = useMemo(() => ({
    main: buildMainTrack(),
    name: buildCategoryTrack("name"),
    animal: buildCategoryTrack("animal"),
    country: buildCategoryTrack("country"),
    food: buildCategoryTrack("food"),
    brand: buildCategoryTrack("brand"),
    screen: buildCategoryTrack("screen"),
  }), []);

  const [missionIndex, setMissionIndex] = useState<Record<ChainKeyOrMain, number>>({
    main: 0, name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0
  });

  const allCategories: ChainKey[] = ["name","animal","country","food","brand","screen"];
  const [unlocked, setUnlocked] = useState<Set<ChainKeyOrMain>>(new Set<ChainKeyOrMain>(["main"]));
  const [unlockOrder, setUnlockOrder] = useState<ChainKeyOrMain[]>(["main"]);
  const lockedCategories = useMemo(() => allCategories.filter((c) => !unlocked.has(c)), [unlocked]);

  const [missionProgress, setMissionProgress] = useState<Record<string, number>>({});
  const currentMissions = useMemo(() => {
    const list: Mission[] = [];
    unlocked.forEach((owner) => {
      const idx = missionIndex[owner] ?? 0;
      const track = missionTracks[owner];
      if (track && idx < track.length) list.push(track[idx]);
    });
    return list;
  }, [unlocked, missionIndex, missionTracks]);

  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());

  /** ===================== Unlock helpers ===================== */
  const appendUnlock = (owner: ChainKey) => {
    setUnlocked((prev) => {
      if (prev.has(owner)) return prev;
      const nx = new Set(prev); nx.add(owner);
      return nx;
    });
    setUnlockOrder((o) => [...o, owner]);
    setMsg(`New category unlocked: ${CHAIN_COLORS[owner].label}!`);
    try { safePlay("unlock"); } catch {}
    try { vfx.confettiBurst({ power: 0.8 }); } catch {}
  };

  const unlockRandomCategory = useCallback(() => {
    const remaining = allCategories.filter((c) => !unlocked.has(c));
    if (remaining.length === 0) return;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    appendUnlock(pick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  /** ===================== Powerups (unique-word charges) ===================== */
  type PowerCharges = Record<PowerKey, number>;

  const [powerCharges, setPowerCharges] = useState<PowerCharges>({
    name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0, same: 0
  });

  const [powerBucketsCredited, setPowerBucketsCredited] = useState<Record<PowerKey, number>>({
    name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0, same: 0
  });

  const [uniqueSeen, setUniqueSeen] = useState<Record<PowerKey, Set<string>>>({
    name: new Set(), animal: new Set(), country: new Set(), food: new Set(), brand: new Set(), screen: new Set(), same: new Set()
  });

  const tryGrantChargeUnique = (key: PowerKey, rawWord: string) => {
    const need = POWER_THRESHOLDS[key];
    if (!need) return;

    const wNorm = norm(rawWord);

    setUniqueSeen((cur) => {
      const prevSet = cur[key] ?? new Set<string>();
      if (prevSet.has(wNorm)) return cur;

      const prevCount = prevSet.size;
      const nextSet = new Set(prevSet);
      nextSet.add(wNorm);
      const newCount = nextSet.size;

      const newBuckets = Math.floor(newCount / need);

      setPowerBucketsCredited((buckets) => {
        const prevBuckets = buckets[key] ?? 0;
        const delta = newBuckets - prevBuckets;
        if (delta > 0) {
          setPowerCharges((ch) => ({ ...ch, [key]: (ch[key] ?? 0) + delta }));
          setLinks((x) => {
            const nx = Math.round((x + 0.5 * delta) * 2) / 2;
            setStats((s) => ({ ...s, linksEarned: s.linksEarned + 0.5 * delta }));
            return nx;
          });
          setMsg(`Powerup charged: ${key === "same" ? "Same-Letter" : CHAIN_COLORS[key].label} (+0.5 LINK)`);
          try { safePlay("coin"); } catch {}
          try { safePlay(`power_${key}_ready` as any); } catch {}
          try { vfx.ringBurstAtFromEl(inputDomRef.current || "input[name='word']"); } catch {}
          return { ...buckets, [key]: newBuckets };
        }
        return buckets;
      });

      return { ...cur, [key]: nextSet };
    });
  };

  const usePower = (key: PowerKey) => {
    setPowerCharges((ch) => {
      if ((ch[key] ?? 0) <= 0) return ch;
      const next = { ...ch, [key]: ch[key] - 1 };
      try { safePlay(`power_${key}_use` as any); } catch {}

      if (key === "country") {
        setUsed(new Set());
        setMsg("NUKE deployed: you may reuse any previous word.");
      } else if (key === "name") {
        setPauseUntilAnswer(true);
        setPaused(true);
        setMsg("Timer frozen until your next valid word!");
      } else if (key === "animal") {
        setSurgeActive(true);
        setMsg("Wild Surge active: +20x until you lose your multiplier.");
      } else if (key === "food") {
        setLives((l) => Math.min(5, l + 1));
        setMsg("Extra Life gained! (Max 5)");
      } else if (key === "brand") {
        setNextWordAddBonus((b) => b + 50);
        setMsg("Sponsor Boost armed: +50x on the next word!");
      } else if (key === "screen") {
        setPaused(true);
        setMsg("Montage: timer frozen for 15s!");
        setTimeout(() => {
          if (!pauseUntilAnswerRef.current) setPaused(false);
        }, 15000);
      } else if (key === "same") {
        setNextWordAddBonus((b) => b + 10);
        setMsg("Mirror Charm armed: +10x on the next word!");
      }
      return next;
    });
  };

  /** ===================== Start/reset ===================== */
  const resetRun = () => {
    setUsed(new Set());
    setRecent([]);
    setScore(0);
    setLinks(0);
    setLives(3);
    setTimeLeft(30);
    setMsg("");
    setPaused(false);
    setSameMult(1);
    setNextWordAddBonus(0);
    setSurgeActive(false);
    setPauseUntilAnswer(false);
    setChains({
      name: { length: 0, multiplier: 1, frozen: false },
      animal: { length: 0, multiplier: 1, frozen: false },
      country: { length: 0, multiplier: 1, frozen: false },
      food: { length: 0, multiplier: 1, frozen: false },
      brand: { length: 0, multiplier: 1, frozen: false },
      screen: { length: 0, multiplier: 1, frozen: false },
    });

    setCompletedTracks(new Set());
    setMissionIndex({ main: 0, name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0 });
    setUnlocked(new Set<ChainKeyOrMain>(["main"]));
    setUnlockOrder(["main"]);
    setMissionProgress({});
    setCompletedMissionIds(new Set());

    setPowerCharges({ name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0, same: 0 });
    setUniqueSeen({
      name: new Set(), animal: new Set(), country: new Set(), food: new Set(), brand: new Set(), screen: new Set(), same: new Set()
    });
    setPowerBucketsCredited({ name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0, same: 0 });

    lastAcceptAtRef.current = null;
    deltasRef.current = [];
    peakTotalMultRef.current = 1;
    currentChainRef.current = 0;
    maxChainRef.current = 0;

    setLast(pickStarter());
    setPrevCats(new Set());
    setShowNamePrompt(false);
    setPlayerName("");
  };
  const start = () => { setStarted(true); resetRun(); };

  /** ===================== Switching (LINKS freeze) ===================== */
  const applySwitching = (enteringCats: Set<ChainKey>, next: Record<ChainKey, ChainState>) => {
    const leaving = new Set<ChainKey>([...prevCats].filter((c) => !enteringCats.has(c)));
    if (leaving.size === 0) return next;
    if (links >= 1) {
      setLinks((l) => { setStats((s) => ({ ...s, linksSpent: s.linksSpent + 1 })); return Math.max(0, l - 1); });
      leaving.forEach((k) => { next[k] = { ...next[k], frozen: true }; });
    } else {
      leaving.forEach((k) => { next[k] = { length: 0, multiplier: 1, frozen: false }; });
      if (leaving.has("animal")) setSurgeActive(false);
    }
    setStats((s) => ({ ...s, switches: s.switches + 1 }));
    return next;
  };

  /** ===================== Validation & Submit ===================== */
  async function validateWord(w: string): Promise<boolean> {
    if (!INPUT_RE.test(w)) return false;
    if (!strictDictionary) return true;

    const lw = w.toLowerCase().trim();
    const lwSing = singularize(lw);
    const nw = norm(w);
    const nwSing = singularize(nw);
    const brandForm = norm(stripCorpSuffixes(w));

    if (dict && (dict.has(lw) || dictNorm.has(nw))) return true;
    if (countries.has(lw) || countriesNorm.has(nw)) return true;
    if (names.has(lw) || namesNorm.has(nw)) return true;
    if (isAnimal(animals, lw) || animalsNorm.has(nw)) return true;
    if (screens.has(lw) || screensNorm.has(nw)) return true;
    if (foods.has(lw) || foodsNorm.has(nw) || foods.has(lwSing) || foodsNorm.has(nwSing)) return true;
    if (brands.has(lw) || brandsNorm.has(nw) || brandsNorm.has(brandForm)) return true;

    return false;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (input?.value || "").trim();
    if (!raw) return;

    if (raw.startsWith("?")) {
      const test = raw.slice(1);
      const cats = Array.from(getCategories(test));
      console.log("DEBUG cats for", test, "=>", cats);
      setMsg(`Debug: ${test} → ${cats.join(", ") || "none"}`);
      input.value = "";
      return;
    }

    const w = raw;
    const wl = w.toLowerCase();
    input.value = "";

    if (used.has(wl)) {
      setMsg("Already used.");
      try { safePlay("used"); } catch {}
      try { vfx.shake(inputDomRef.current || "input[name='word']"); } catch {}
      return;
    }
    if (last !== "start") {
      if (firstLetter(wl) !== lastLetter(last).toLowerCase()) {
        try { vfx.shake(inputDomRef.current || "input[name='word']"); } catch {}
        loseLife(`Invalid: Must start with “${lastLetter(last).toLowerCase()}”.`);
        return;
      }
      if (!wl.includes(firstLetter(last).toLowerCase())) {
        try { vfx.shake(inputDomRef.current || "input[name='word']"); } catch {}
        loseLife(`Invalid: Must include “${firstLetter(last).toLowerCase()}”.`);
        return;
      }
    }
    const ok = await validateWord(w);
    if (!ok) {
      try { vfx.shake(inputDomRef.current || "input[name='word']"); } catch {}
      loseLife("Invalid: Not an official word.");
      return;
    }

    if (pauseUntilAnswer) {
      setPauseUntilAnswer(false);
      setPaused(false);
    }

    const now = Date.now();
    if (lastAcceptAtRef.current != null) {
      const dt = now - lastAcceptAtRef.current;
      if (Number.isFinite(dt) && dt > 0 && dt < 10 * 60 * 1000) {
        deltasRef.current.push(dt);
      }
    }
    lastAcceptAtRef.current = now;

    currentChainRef.current += 1;
    if (currentChainRef.current > maxChainRef.current) {
      maxChainRef.current = currentChainRef.current;
    }

    const sameLetter = w[0].toLowerCase() === w[w.length - 1].toLowerCase();
    if (sameLetter) {
      setSameMult((s) => 1 + (s - 1) + SAME_LETTER_GROWTH);
      setStats((s) => ({ ...s, sameLetterWords: s.sameLetterWords + 1 }));
      tryGrantChargeUnique("same", w);
    } else if (sameMult > 1) setSameMult(1);

    const enteringCats = getCategories(w);
    let next = { ...chains };
    enteringCats.forEach((k) => {
      const c = next[k];
      next[k] = { length: c.length + 1, multiplier: Math.max(1, c.multiplier + CHAIN_STEP_GROWTH), frozen: false };
      tryGrantChargeUnique(k, w);
    });
    next = applySwitching(enteringCats, next);
    setChains(next);
    setPrevCats(enteringCats);

    const catsArr = Array.from(enteringCats);
    const base = catsArr.length ? Math.max(...catsArr.map((k) => (CHAIN_BASE as any)[k] ?? 1)) : CHAIN_BASE.normal;

    const additive = (surgeActive ? 20 : 0) + nextWordAddBonus;
    const effectiveMult = totalMult + additive;
    const gained = Math.round(w.length * base * effectiveMult);
    setScore((s) => s + gained);
    setMsg(
      `+${gained} points (total ${fmt(effectiveMult)}${
        nextWordAddBonus > 0 ? ` · +${nextWordAddBonus}x next-word` : ""
      }${surgeActive ? " · +20x surge" : ""})`
    );

    try { safePlay("accept"); } catch {}

    try { stop("warning"); } catch {}
    warningPlayingRef.current = false;
    lowWarnTickRef.current = null;

    try {
      const el = inputDomRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        vfx.ringBurstAt(r.left + r.width / 2, r.top + r.height / 2);
        vfx.glowOnce(el);
      } else {
        vfx.ringBurstAtFromEl("input[name='word']");
      }
    } catch {}

    if (gained >= 2000) {
      try { safePlay("bigword"); } catch {}
      try { vfx.confettiBurst({ power: 2 }); } catch {}
      try { vfx.shake("#score", 300); } catch {}
    }

    if (nextWordAddBonus !== 0) setNextWordAddBonus(0);

    setStats((s) => {
      const upd: Stats = { ...s, totalWords: s.totalWords + 1, highestWordScore: Math.max(s.highestWordScore, gained) };
      if (enteringCats.has("animal")) { upd.animals = s.animals + 1; upd.longestAnimalStreak = Math.max(s.longestAnimalStreak, next.animal.length); }
      if (enteringCats.has("country")) { upd.countries = s.countries + 1; upd.longestCountryStreak = Math.max(s.longestCountryStreak, next.country.length); }
      if (enteringCats.has("name")) { upd.names = s.names + 1; upd.longestNameStreak = Math.max(s.longestNameStreak, next.name.length); }
      return upd;
    });

    setUsed((u) => new Set(u).add(w.toLowerCase()));
    setRecent((r) => [w, ...r].slice(0, 30));
    setLast(w);
    setTimeLeft(30);

    setMissionProgress((mp) => {
      const nx = { ...mp };
      currentMissions.forEach((m) => {
        const id = m.id;
        const cur = nx[id] ?? 0;

        if (m.owner !== "main") {
          const inCat = enteringCats.has(m.chain);
          if (m.kind === "enterChain" && inCat) nx[id] = Math.min((m as any).target, cur + 1);
          if (m.kind === "reachMult") {
            const current = next[m.chain].multiplier;
            nx[id] = Math.min((m as any).target, current);
          }
          if (m.kind === "combo") nx[id] = inCat ? Math.min((m as any).target, cur + 1) : 0;
          if (m.kind === "scoreWord" && inCat && gained >= (m as any).target) nx[id] = (m as any).target;
          if (m.kind === "validWords" && inCat) nx[id] = Math.min((m as any).target, cur + 1);
        } else {
          if (m.kind === "reachSame") {
            nx[id] = Math.min((m as any).target, sameMult);
          } else if (m.kind === "totalScore") {
            nx[id] = Math.min((m as any).target, cur + gained);
          } else if (m.kind === "sequence") {
            const seq = (m as any).sequence as ChainKey[];
            const idx = cur || 0;
            const need = seq[idx];
            const matched = need ? enteringCats.has(need) : false;
            nx[id] = matched ? idx + 1 : (enteringCats.has(seq[0]) ? 1 : 0);
          }
        }
      });
      return nx;
    });
  };

  /** ===== Reward & roll-over & unlock gating ===== */
  useEffect(() => {
    if (!currentMissions.length) return;

    const justFinished = currentMissions.filter((m) => {
      const id = m.id;
      const prog = missionProgress[id] ?? 0;
      const target = m.owner === "main" && m.kind === "sequence" ? (m as any).sequence.length : (m as any).target;
      return prog >= target && !completedMissionIds.has(id);
    });
    if (!justFinished.length) return;

    const addLinks = justFinished.reduce((sum, m) => sum + (Number((m as any).reward) || 0), 0);

    if (addLinks > 0) {
      setLinks((x) => {
        const nx = x + addLinks;
        setStats((s) => ({ ...s, linksEarned: s.linksEarned + addLinks }));
        return nx;
      });
      const amt = addLinks.toFixed(1);
      const plural = Math.abs(addLinks - 1) < 1e-9 ? "" : "s";
      setMsg(`Mission complete! +${amt} LINK${plural}`);
      try { safePlay("mission"); } catch {}
      try { safePlay("coin"); } catch {}
      try { vfx.confettiBurst({ power: 1.2 }); } catch {}
    }

    setCompletedMissionIds((prev) => {
      const nx = new Set(prev);
      justFinished.forEach((m) => nx.add(m.id));
      return nx;
    });

    justFinished.forEach((m) => {
      const owner = m.owner as ChainKeyOrMain;
      setMissionIndex((idx) => {
        const cur = idx[owner] ?? 0;
        const maxLen = missionTracks[owner].length;
        const nextIdx = Math.min(cur + 1, maxLen);
        if (nextIdx >= maxLen) {
          setCompletedTracks((set0) => {
            if (set0.has(owner)) return set0;
            const s = new Set(set0); s.add(owner);
            return s;
          });
        }
        return { ...idx, [owner]: nextIdx };
      });
    });

    const onlyMainUnlocked = unlockOrder.length === 1;
    if (onlyMainUnlocked && justFinished.some((m) => m.owner === "main")) {
      unlockRandomCategory();
      return;
    }
    const lastUnlocked = unlockOrder[unlockOrder.length - 1];
    if (lastUnlocked && lastUnlocked !== "main") {
      const finishedIdsForLast = justFinished
        .filter((m) => m.owner === lastUnlocked)
        .map((m) => m.id);

      if (finishedIdsForLast.length > 0) {
        const track = missionTracks[lastUnlocked];
        if (track && track.length > 0) {
          const firstId = track[0].id;
          if (finishedIdsForLast.includes(firstId)) {
            unlockRandomCategory();
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionProgress, currentMissions]);

  /** ===================== UI helpers ===================== */
  const totalLevels = 7; // per track
  const ownerProgressPct = (owner: ChainKeyOrMain) => {
    const idx = missionIndex[owner] ?? 0;
    const pct = Math.min(100, Math.round((idx / totalLevels) * 100));
    return pct;
  };
  const ownerCompleted = (owner: ChainKeyOrMain) => {
    const idx = missionIndex[owner] ?? 0;
    return idx >= totalLevels || completedTracks.has(owner);
  };

  const powerProgress = (key: PowerKey) => {
    const seen = uniqueSeen[key]?.size ?? 0;
    const need = POWER_THRESHOLDS[key] || 1;
    const mod = seen % need;
    const cur = (seen > 0 && mod === 0) ? need : mod; // show full when just charged
    return { cur, need };
  };

  // ===== Reusable powerups grid so desktop & mobile stay in sync =====
  const PowerupsGrid: React.FC = () => (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {(() => { const p = powerProgress("country"); return (
        <PowerRow icon="💥" label="NUKE" info="Countries"
          available={powerCharges.country} onUse={() => usePower("country")}
          fillClass={CHAIN_COLORS.country.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.country > 0}
          ringClass="ring-purple-400" />
      );})()}
      {(() => { const p = powerProgress("name"); return (
        <PowerRow icon="❄️" label="Freeze" info="Names"
          available={powerCharges.name} onUse={() => usePower("name")}
          fillClass={CHAIN_COLORS.name.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.name > 0}
          ringClass="ring-blue-400" />
      );})()}
      {(() => { const p = powerProgress("animal"); return (
        <PowerRow icon="🐾" label="Wild Surge" info="Animals"
          available={powerCharges.animal} onUse={() => usePower("animal")}
          fillClass={CHAIN_COLORS.animal.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.animal > 0}
          ringClass="ring-green-400" />
      );})()}
      {(() => { const p = powerProgress("food"); return (
        <PowerRow icon="🍔" label="Extra Life" info="Foods"
          available={powerCharges.food} onUse={() => usePower("food")}
          fillClass={CHAIN_COLORS.food.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.food > 0}
          ringClass="ring-amber-400" />
      );})()}
      {(() => { const p = powerProgress("brand"); return (
        <PowerRow icon="💼" label="Sponsor +50x" info="Brands"
          available={powerCharges.brand} onUse={() => usePower("brand")}
          fillClass={CHAIN_COLORS.brand.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.brand > 0}
          ringClass="ring-rose-400" />
      );})()}
      {(() => { const p = powerProgress("screen"); return (
        <PowerRow icon="🎬" label="Montage" info="TV/Movies"
          available={powerCharges.screen} onUse={() => usePower("screen")}
          fillClass={CHAIN_COLORS.screen.solid} pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.screen > 0}
          ringClass="ring-teal-400" />
      );})()}
      {(() => { const p = powerProgress("same"); return (
        <PowerRow icon="🔁" label="Mirror Charm" info="Same-Letter"
          available={powerCharges.same} onUse={() => usePower("same")}
          fillClass="bg-gray-300" pct={(p.cur / p.need) * 100}
          counter={`${p.cur}/${p.need}`} ready={powerCharges.same > 0}
          ringClass="ring-gray-400" />
      );})()}
    </div>
  );
  /** ===================== Typing SFX (gentle throttle, non-blocking) ===================== */
  const lastTypeAt = useRef<number>(0);
  const onTypeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length !== 1) return; // only real character keys
    const now = performance.now();
    if (now - lastTypeAt.current > 70) {
      safePlay("typing", { volume: 0.25 });
      lastTypeAt.current = now;
    }
  };

  /** ===================== UI ===================== */
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Post-game leaderboard prompt */}
        {showNamePrompt && (
          <div className="md:col-span-3 card flex flex-col gap-3 border border-dashed border-gray-300">
            <h3 className="text-xl font-semibold">Submit your score</h3>
            <div className="text-sm text-gray-600">Final Score: <b>{finalScore}</b></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input flex-1" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
              <button className="btn btn-primary" onClick={submitScore}>Submit to Leaderboard</button>
              <button className="btn" onClick={() => setShowNamePrompt(false)}>Dismiss</button>
            </div>
            <div className="text-xs text-gray-500">You can start a new run any time.</div>
          </div>
        )}

        {!started ? (
          <div className="md:col-span-3 card flex flex-col items-center gap-3">
            <h1 className="text-3xl font-bold">Word Chains</h1>
            <p className="text-gray-600 text-center max-w-2xl">
              Next word must start with the previous last letter and include the previous first letter somewhere.
              Words that sit in multiple categories build <b>all</b> those category multipliers.
              Spend LINKS to keep multipliers when switching categories.
            </p>
            <label className="text-sm text-gray-600 flex items-center gap-2 mt-2">
              <input type="checkbox" checked={strictDictionary} onChange={(e) => setStrictDictionary(e.target.checked)} />
              Strict dictionary validation
            </label>
            <button className="btn btn-primary mt-3" onClick={start} disabled={!dict}>
              {dict ? "Start Game" : "Loading dictionary..."}
            </button>
          </div>
        ) : (
          <>
            {/* Score & Chains */}
            <div className="card space-y-3" id="score">
              <div className="text-lg">Score: <b>{score}</b></div>
              <div>Lives: {"❤️".repeat(Math.max(0, lives))}{lives <= 0 && " (none)"} (max 5 )</div>
              <div className="flex items-center gap-2">
                <div>Time Left: {timeLeft}s {paused && <span className="text-xs text-gray-500">(frozen)</span>}</div>
              </div>
              <div>LINKS: {Number(links).toFixed(1)}</div>

              <div className="text-sm">
                Total Multiplier: <b>{fmt(totalMult)}</b>
                <span className="ml-2 text-xs text-gray-600">
                  (base {totalMultData.catSum.toFixed(2)} + missions +{totalMultData.missionAdd} × same-letter ×{sameMult.toFixed(2)})
                </span>
              </div>

              {/* Chain rows with frozen & active VFX */}
              <div className="grid gap-2 pt-2 text-sm">
                <ChainRow
                  k="name"
                  state={chains.name}
                  color={CHAIN_COLORS.name}
                  active={prevCats.has("name")}
                />
                <ChainRow
                  k="animal"
                  state={chains.animal}
                  color={CHAIN_COLORS.animal}
                  active={prevCats.has("animal")}
                />
                <ChainRow
                  k="country"
                  state={chains.country}
                  color={CHAIN_COLORS.country}
                  active={prevCats.has("country")}
                />
                <ChainRow
                  k="food"
                  state={chains.food}
                  color={CHAIN_COLORS.food}
                  active={prevCats.has("food")}
                />
                <ChainRow
                  k="brand"
                  state={chains.brand}
                  color={CHAIN_COLORS.brand}
                  active={prevCats.has("brand")}
                />
                <ChainRow
                  k="screen"
                  state={chains.screen}
                  color={CHAIN_COLORS.screen}
                  active={prevCats.has("screen")}
                />
                <div>Same-Letter Bonus: <b>{fmt(sameMult)}</b></div>
              </div>
            </div>

            {/* Input & recent */}
            <div className="card md:col-span-1">
              <div className="text-sm text-gray-500">Last word: <b className="break-words">{last === "start" ? "—" : last}</b></div>
              <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
                <input
                  ref={inputDomRef}
                  name="word"
                  placeholder="Enter a word"
                  className="flex-1 rounded-xl border p-3 break-words"
                  autoFocus
                  onKeyDown={onTypeKey}
                />
                <button className="btn btn-primary">Submit</button>
              </form>
              <div className="mt-3 text-rose-600 min-h-6 break-words">{msg}</div>
              <div className="mt-4">
                <h3 className="font-semibold">Recent Words</h3>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-2 gap-2">
                  {recent.map((w, i) => {
                    const cats = Array.from(getCategories(w));
                    return (
                      <div key={w + String(i)} className="rounded-lg border border-gray-200 bg-white p-2 text-sm break-words">
                        <div className="font-medium">{w}</div>
                        {cats.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {cats.map((c) => (
                              <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] ${CHAIN_COLORS[c].badge} ${CHAIN_COLORS[c].text}`}>
                                {CHAIN_COLORS[c].label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: Active missions */}
            <div className="md:col-span-1 space-y-4" id="missions-panel">
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Missions</h3>
                  <div className="text-sm text-gray-500">One active per unlocked track</div>
                </div>

                <div className="space-y-3">
                  {unlockOrder.map((owner) => {
                    const idx = missionIndex[owner] ?? 0;
                    const track = missionTracks[owner];
                    const c = CHAIN_COLORS[owner];
                    const done = ownerCompleted(owner);
                    const pct = ownerProgressPct(owner);

                    if (done) {
                      return (
                        <div key={String(owner)} className={`rounded-xl border ${c.border} ${c.solid} p-2 opacity-90`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge} ${c.text}`}>{c.label}</span>
                              <span className="text-xs text-gray-700">Category progress: <b>100%</b></span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${c.badge} ${c.text} border ${c.border}`}>Completed · +10 base</span>
                          </div>
                        </div>
                      );
                    }

                    const m = track[idx];
                    if (!m) return null;
                    const id = m.id;
                    const progressCurrent = missionProgress[id] ?? 0;
                    const isReachMult = (m.owner !== "main") && (m as any).kind === "reachMult";
                    const target = m.owner === "main" && (m as any).kind === "sequence"
                      ? (m as any).sequence.length
                      : (m as any).target;
                    const bar = Math.min(100, (Number(progressCurrent) / Number(target)) * 100);

                    const displayCurrent = isReachMult ? Number(progressCurrent).toFixed(2) : String(progressCurrent);
                    const displayTarget  = isReachMult ? Number(target).toFixed(2) : String(target);

                    return (
                      <div key={id} className={`rounded-xl border ${c.border} p-2`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge} ${c.text}`}>{c.label}</span>
                            <span className="text-xs text-gray-600">Category progress: <b>{pct}%</b></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm break-words">
                            {m.owner !== "main" && (
                              <>
                                {(m as any).kind === "enterChain" && (<>Get <b>{(m as any).target}</b> {c.label.toLowerCase()} word{(m as any).target > 1 ? "s" : ""}</>)}
                                {(m as any).kind === "reachMult" && (<>Reach <b>{c.label}</b> multiplier of <b>x{Number((m as any).target).toFixed(2)}</b></>)}
                                {(m as any).kind === "combo" && (<>Chain <b>{(m as any).target}</b> consecutive <b>{c.label}</b> words</>)}
                                {(m as any).kind === "scoreWord" && (<>Score <b>{(m as any).target}</b> with a <b>{c.label}</b> word</>)}
                                {(m as any).kind === "validWords" && (<>Play <b>{(m as any).target}</b> valid <b>{c.label}</b> words</>)}
                              </>
                            )}
                            {m.owner === "main" && (
                              <>
                                {(m as any).kind === "reachSame" && (<>Reach <b>Same-Letter</b> multiplier of <b>x{Number((m as any).target).toFixed(2)}</b></>)}
                                {(m as any).kind === "totalScore" && (<>Reach a total score of <b>{(m as any).target}</b></>)}
                                {(m as any).kind === "sequence" && (<>Sequence: <b>{(m as any).sequence.map((x: ChainKey) => CHAIN_COLORS[x].label).join(" → ")}</b></>)}
                              </>
                            )}
                            <span className="ml-2 text-xs text-gray-600">
                              — Reward: <b>{Number((m as any).reward ?? 0).toFixed(1)}</b> LINK
                            </span>
                          </span>

                          <div className="min-w-[120px] text-right text-xs text-gray-600">
                            {displayCurrent}/{displayTarget}
                            <div className="mt-1 h-1.5 w-32 rounded bg-gray-200 overflow-hidden">
                              <div className="h-1.5 bg-black/60" style={{ width: `${bar}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {lockedCategories.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <b>{lockedCategories.length}</b> categor{lockedCategories.length === 1 ? "y is" : "ies are"} locked — finish the Level 1 mission of the latest unlocked category to reveal the next.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== Powerups Dock: fixed on mobile (safe-area), sticky on md+ ===== */}
      {started && dict && (
        <>
          {/* Mobile: fixed dock */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
            role="toolbar"
            aria-label="Powerups"
          >
            <div className="mx-auto w-full max-w-[1000px] px-3 pb-2 pt-2">
              <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-xl">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Powerups</div>
                  <div className="text-xs text-gray-500">Fills with each <b>unique</b> word</div>
                </div>
                <div className="px-3 pb-3">
                  <PowerupsGrid />
                </div>
              </div>
            </div>
          </div>

          {/* Spacer so mobile content isn't hidden behind the dock */}
          <div className="h-[92px] md:hidden" />

          {/* Desktop/Tablet: sticky panel */}
          <div className="hidden md:block sticky bottom-2 z-40 mt-4">
            <div className="mx-auto w-[min(100%,1000px)] px-3">
              <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-xl">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Powerups</div>
                  <div className="text-xs text-gray-500">Fills with each <b>unique</b> word</div>
                </div>
                <div className="px-3 pb-3">
                  <PowerupsGrid />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Local styles for ice & active glow */}
      <style jsx global>{`
        @keyframes wcPulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 150, 255, 0.35); }
          70% { box-shadow: 0 0 0 8px rgba(0, 150, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 150, 255, 0); }
        }
        .wc-active-glow { animation: wcPulse 1.4s ease-out 1; }

        .wc-ice-wrap { position: absolute; inset: 0; border-radius: 0.75rem; overflow: hidden; pointer-events: none; z-index: 1; }
        .wc-ice-rim {
          position: absolute; inset: 0; border-radius: inherit;
          box-shadow:
            inset 0 0 0 2px rgba(140, 195, 255, .75),
            inset 0 0 22px rgba(120, 185, 255, .55),
            inset 0 8px 28px rgba(180, 225, 255, .35);
          filter: saturate(1.1);
          opacity: .95;
        }
        .wc-ice-tint {
          position: absolute; inset: 0; border-radius: inherit;
          background:
            radial-gradient(120% 120% at 10% 110%, rgba(190,225,255,.42), rgba(160,210,255,.36) 35%, rgba(135,200,255,.30) 60%, rgba(125,195,255,.12) 80%),
            linear-gradient(to top, rgba(150,205,255,.40), rgba(235,250,255,.28));
          backdrop-filter: saturate(1.15) brightness(1.06) blur(.5px);
          -webkit-backdrop-filter: saturate(1.15) brightness(1.06) blur(.5px);
          mask: conic-gradient(from 270deg at 0% 100%, transparent 0deg, black 0deg);
          animation: wcIceGrow 700ms ease-out forwards;
        }
        @keyframes wcIceGrow {
          from { mask: conic-gradient(from 270deg at 0% 100%, transparent 0deg, black 0deg); }
          to   { mask: conic-gradient(from 270deg at 0% 100%, transparent 360deg, black 360deg); }
        }
        .wc-ice-noise {
          position: absolute; inset: 0; opacity: .35; mix-blend-mode: overlay;
          background-size: 240px 240px;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(255,255,255,.25) 0 12%, transparent 13% 100%),
            radial-gradient(circle at 70% 60%, rgba(255,255,255,.2) 0 10%, transparent 11% 100%),
            radial-gradient(circle at 35% 80%, rgba(255,255,255,.18) 0 9%, transparent 10% 100%),
            radial-gradient(circle at 85% 25%, rgba(255,255,255,.18) 0 11%, transparent 12% 100%);
          animation: wcNoiseDrift 6s ease-in-out infinite alternate;
        }
        @keyframes wcNoiseDrift {
          from { transform: translate3d(0,0,0) scale(1); }
          to   { transform: translate3d(-6px,-4px,0) scale(1.02); }
        }
        .wc-ice-cracks {
          position: absolute; inset: 0; opacity: .7;
          background-repeat: repeat; background-size: 220px 140px;
          filter: saturate(1.15) drop-shadow(0 0 1px rgba(90,150,220,.25));
          animation: wcCrackFade 480ms ease-out 80ms both;
          --crack: url("data:image/svg+xml;utf8,\
            <svg xmlns='http://www.w3.org/2000/svg' width='220' height='140' viewBox='0 0 220 140'>\
              <g fill='none' stroke='%2387befc' stroke-opacity='1' stroke-width='1.2' stroke-linecap='round'>\
                <path d='M10 120 L40 90 L70 110' stroke-dasharray='6 9'><animate attributeName=\"stroke-dashoffset\" from=\"80\" to=\"0\" dur=\"0.9s\" fill=\"freeze\"/></path>\
                <path d='M95 135 L115 95 L160 115' stroke-dasharray='7 8'><animate attributeName=\"stroke-dashoffset\" from=\"70\" to=\"0\" dur=\"0.95s\" fill=\"freeze\"/></path>\
                <path d='M20 20 L35 35 L55 22' stroke-dasharray='5 7'><animate attributeName=\"stroke-dashoffset\" from=\"60\" to=\"0\" dur=\"0.8s\" fill=\"freeze\"/></path>\
                <path d='M130 18 L150 40 L175 24' stroke-dasharray='5 8'><animate attributeName=\"stroke-dashoffset\" from=\"60\" to=\"0\" dur=\"0.85s\" fill=\"freeze\"/></path>\
                <path d='M78 8 L85 28 L98 14' stroke-dasharray='4 7'><animate attributeName=\"stroke-dashoffset\" from=\"50\" to=\"0\" dur=\"0.8s\" fill=\"freeze\"/></path>\
                <path d='M62 92 L70 108 L84 98' stroke-dasharray='4 7'><animate attributeName=\"stroke-dashoffset\" from=\"50\" to=\"0\" dur=\"0.8s\" fill=\"freeze\"/></path>\
              </g>\
            </svg>");
          background-image: var(--crack);
        }
        @keyframes wcCrackFade { from { opacity: 0; } to { opacity: .7; } }

        .wc-ice-sparkles { position: absolute; inset: 0; overflow: hidden; }
        .wc-ice-sparkle {
          position: absolute; width: 6px; height: 6px; border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,.5) 45%, rgba(255,255,255,0) 72%);
          left: calc(6% + (88% * var(--i, 0)));
          top: 100%;
          opacity: 0;
          animation: wcSpark 1500ms ease-in infinite;
          animation-delay: var(--d, 0s);
          transform: translateY(0) scale(.7);
        }
        .wc-ice-sparkle:nth-child(odd)  { --i: .12; width: 4px; height: 4px; }
        .wc-ice-sparkle:nth-child(3n)   { --i: .42; }
        .wc-ice-sparkle:nth-child(4n)   { --i: .68; }
        .wc-ice-sparkle:nth-child(5n)   { --i: .84; }
        @keyframes wcSpark {
          0%   { opacity: 0; transform: translateY(0) scale(.6); }
          12%  { opacity: 1; }
          75%  { opacity: .8; }
          100% { opacity: 0; transform: translateY(-140%) scale(1); }
        }
      `}</style>
    </>
  );
} // ← END WordChains component


/** ===== Tiny canvas burst for thaw/unfreeze moments ===== */
function thawBurstAt(
  target?: HTMLElement | null,
  opts?: { shards?: number; durationMs?: number }
) {
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "2";

  (target.style as CSSStyleDeclaration).position ||= "relative";
  target.appendChild(canvas);

  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) { canvas.remove(); return; }
  const C = ctx2d as CanvasRenderingContext2D;
  C.scale(dpr, dpr);

  const N = Math.max(14, Math.min(48, (opts?.shards ?? 26)));
  const dur = Math.max(300, Math.min(1200, opts?.durationMs ?? 650));
  const t0 = performance.now();

  type Shard = {
    x: number; y: number; vx: number; vy: number;
    rot: number; vrot: number; r: number; a: number; hue: number;
  };
  const shards: Shard[] = [];
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N + (Math.random() * 0.7 - 0.35);
    const speed = 160 + Math.random() * 220;
    shards.push({
      x: w * 0.5, y: h * 0.5,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 40 * Math.random(),
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 6,
      r: 2 + Math.random() * 10,
      a: 1,
      hue: 205 + Math.random() * 20,
    });
  }

  function step(now: number) {
    const t = (now - t0) / dur; // 0..1
    if (t >= 1) { canvas.remove(); return; }

    C.clearRect(0, 0, w, h);
    C.save();
    C.globalCompositeOperation = "lighter";

    for (const s of shards) {
      s.x += s.vx * (1 / 60);
      s.y += s.vy * (1 / 60);
      s.vy += 240 * (1 / 60);
      s.rot += s.vrot * (1 / 60);
      s.a = Math.max(0, 1 - t);

      C.save();
      C.translate(s.x, s.y);
      C.rotate(s.rot);
      C.beginPath();
      C.moveTo(0, 0);
      C.lineTo(s.r * 0.6, -s.r * 3);
      C.lineTo(-s.r * 0.6, -s.r * 2.6);
      C.closePath();
      C.fillStyle = `hsla(${s.hue}, 90%, 70%, ${0.65 * s.a})`;
      C.strokeStyle = `hsla(${s.hue}, 95%, 85%, ${0.8 * s.a})`;
      C.lineWidth = 0.8;
      C.fill();
      C.stroke();
      C.restore();
    }

    C.restore();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


/** ===== ChainRow: one line per category with frozen overlay & thaw burst ===== */
function ChainRow({
  k,
  state,
  color,
  active,
}: {
  k: "name" | "animal" | "country" | "food" | "brand" | "screen";
  state: { length: number; multiplier: number; frozen: boolean };
  color: { badge: string; border: string; text: string; label: string; solid: string };
  active?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const prevFrozen = React.useRef(state.frozen);
  const [thawing, setThawing] = React.useState(false);

  React.useEffect(() => {
    const was = prevFrozen.current;
    const now = state.frozen;
    if (was && !now) {
      setThawing(true);
      thawBurstAt(containerRef.current, { shards: 24, durationMs: 560 });
      const t = setTimeout(() => setThawing(false), 600);
      prevFrozen.current = now;
      return () => clearTimeout(t);
    }
    prevFrozen.current = now;
  }, [state.frozen]);

  return (
    <div
      ref={containerRef}
      className={[
        "relative rounded-xl border p-2 bg-white/80 overflow-hidden",
        color.border,
        active ? "wc-active-glow ring-1 ring-sky-300" : "",
        state.frozen ? "shadow-inner" : "",
      ].join(" ")}
    >
      {state.frozen && <FrozenOverlay />}

      {thawing && <div className="wc-thaw-flash" aria-hidden />}

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color.badge} ${color.text}`}>
            {color.label}
          </span>
          {state.frozen && <span className="text-[11px] text-sky-800/90">frozen</span>}
        </div>
        <div className="text-sm">
          <b>{fmt(state.multiplier)}</b> <span className="text-gray-600">len {state.length}</span>
        </div>
      </div>
    </div>
  );
}

/** ===== FrozenOverlay: bold icy growth + rim + cracks + sparkles ===== */
function FrozenOverlay() {
  return (
    <div className="wc-ice-wrap" aria-hidden>
      <div className="wc-ice-rim" />
      <div className="wc-ice-tint" />
      <div className="wc-ice-noise" />
      <div className="wc-ice-cracks" />
      <div className="wc-ice-sparkles">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="wc-ice-sparkle" style={{ ['--d' as any]: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

/** ===== PowerRow (tile used by PowerupsGrid) ===== */
function PowerRow({
  label,
  icon,
  available,
  onUse,
  fillClass,
  pct,
  counter,
  ready,
  ringClass,
  info,
}: {
  label: string;
  icon?: string;
  available: number;
  onUse: () => void;
  fillClass?: string;
  pct?: number;
  counter?: string;
  ready?: boolean;
  ringClass?: string;
  info?: string;
}) {
  const pctClamped = Math.min(100, Math.max(0, Math.round(pct || 0)));
  const canUse = available > 0;

  const handleClick = () => {
    if (canUse) onUse();
  };

  return (
    <div
      role="button"
      tabIndex={canUse ? 0 : -1}
      aria-disabled={!canUse}
      onClick={handleClick}
      onKeyDown={(e) => { if (canUse && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onUse(); } }}
      className={[
        "relative overflow-hidden rounded-xl border bg-white",
        "transition-all select-none",
        canUse ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : "cursor-not-allowed opacity-75",
        ready && canUse ? `ring-2 ring-offset-1 ring-offset-white ${ringClass || ""} wc-glow` : ""
      ].join(" ")}
    >
      {/* fill layer */}
      <div
        className={`${fillClass || "bg-black/60"} absolute inset-y-0 left-0 opacity-70 transition-all duration-300`}
        style={{ width: `${pctClamped}%` }}
        aria-hidden
      />
      {/* sheen */}
      <div
        className="absolute inset-y-0 left-0 w-4 bg-white/10 pointer-events-none"
        style={{ transform: `translateX(${pctClamped}%)` }}
        aria-hidden
      />
      {/* content */}
      <div className="relative z-10 px-3 pt-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-lg" aria-hidden>{icon}</span>}
            <span className="text-sm font-semibold whitespace-normal break-words leading-tight">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold tabular-nums">{available}</span>
          </div>
        </div>

        {(info || counter) && (
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-800">
            <span className="whitespace-normal break-words">{info}</span>
            {counter && <span className="ml-2 shrink-0 tabular-nums">{counter}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
