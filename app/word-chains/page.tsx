"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    // optional enriched fields (we will fill these at endGame as fallbacks)
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
 /** ===================== Multiplier (ADD +10 per completed section) ===================== */
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
  const lastAcceptAtRef = useRef<number | null>(null); // last accepted word time
  const deltasRef = useRef<number[]>([]);              // ms gaps between accepted words (per run)
  const peakTotalMultRef = useRef<number>(1);          // peak effective multiplier this run
  const currentChainRef = useRef<number>(0);           // uninterrupted valid-word chain (any)
  const maxChainRef = useRef<number>(0);               // longest chain this run

  /** ===================== Power thresholds & state ===================== */
  // thresholds per power (unique words needed per charge)
  const POWER_THRESHOLDS: Record<PowerKey, number> = {
    name: 10,      // Names → Freeze until next valid answer
    animal: 10,    // Animals → +20x surge (until multiplier lost)
    country: 10,   // Countries → NUKE
    food: 5,       // Foods → +1 life (max 5)
    brand: 5,      // Brands → +50x next word only
    screen: 10,    // TV/Movies → freeze 15s
    same: 10,      // Same-letter → +10x next word only
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
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [started, paused]);

  useEffect(() => { if (started && timeLeft <= 0) loseLife("Time's up!"); }, [timeLeft, started]);

  const loseLife = (why: string) => {
    // breaking the chain on a mistake/timeout
    currentChainRef.current = 0;
    setSurgeActive(false); // losing a life ends animal surge
    setLives((l) => {
      const n = l - 1;
      if (n <= 0) endGame(why);
      else { setMsg(`${why} – you lost a life`); setTimeLeft(30); }
      return n;
    });
  };

  // Additive multiplier bonuses
  const [nextWordAddBonus, setNextWordAddBonus] = useState(0); // e.g., +50x or +10x next word
  const [surgeActive, setSurgeActive] = useState(false);       // +20x until multiplier lost

  // Freeze-until-next-answer (Names)
  const [pauseUntilAnswer, setPauseUntilAnswer] = useState(false);
  const pauseUntilAnswerRef = useRef(false);
  useEffect(() => { pauseUntilAnswerRef.current = pauseUntilAnswer; }, [pauseUntilAnswer]);

  // Track peak *effective* multiplier (base total + additives)
  useEffect(() => {
    const eff = totalMult + (surgeActive ? 20 : 0) + nextWordAddBonus;
    if (eff > peakTotalMultRef.current) peakTotalMultRef.current = eff;
  }, [totalMult, surgeActive, nextWordAddBonus]);

// REPLACE your existing endGame with this:
const endGame = async (reason: string) => {
  setStarted(false);
  setMsg(`Game over: ${reason}`);
  setFinalScore(score);

  // Compute per-run avg speed (ms/word)
  const gaps = deltasRef.current;
  const perRunAvgMs = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;

  // ----- Local analytics stores (used by stats page) -----
  try {
    // 1) per-run speed list
    const speeds = JSON.parse(localStorage.getItem("wc_session_speeds") || "[]");
    const speedsArr = Array.isArray(speeds) ? speeds : [];
    if (perRunAvgMs != null && isFinite(perRunAvgMs) && perRunAvgMs > 0) {
      speedsArr.push(perRunAvgMs);
    }
    localStorage.setItem("wc_session_speeds", JSON.stringify(speedsArr));

    // 2) session counter
    const prevSessions = Number(localStorage.getItem("wc_total_sessions") || "0") || 0;
    localStorage.setItem("wc_total_sessions", String(prevSessions + 1));

    // 3) peak effective multiplier for this run (already tracking effects)
    const peaks = JSON.parse(localStorage.getItem("wc_peak_multipliers") || "[]");
    const peaksArr = Array.isArray(peaks) ? peaks : [];
    const peakThisRun = Number(peakTotalMultRef.current) || 1;
    peaksArr.push(peakThisRun);
    localStorage.setItem("wc_peak_multipliers", JSON.stringify(peaksArr));
  } catch { /* ignore */ }

  // Derive run-level fallbacks
  const uniqueWordsThisRun = used.size;
  const longestChainThisRun = maxChainRef.current || 0;
  const highestMultThisRun = Number((peakTotalMultRef.current || 1).toFixed(2));

  // ----- Merge with previous local all-time to preserve "records" -----
  let prevLocal: any = {};
  try { prevLocal = JSON.parse(localStorage.getItem("wc_stats") || "{}") || {}; } catch {}

  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const sessionsNow = num(localStorage.getItem("wc_total_sessions")); // already incremented above

  const mergedAllTime = {
    // keep any extra fields that may exist
    ...prevLocal,

    // -------- accumulators (add) --------
    totalWords:        num(prevLocal.totalWords)        + num(stats.totalWords),
    animals:           num(prevLocal.animals)           + num(stats.animals),
    countries:         num(prevLocal.countries)         + num(stats.countries),
    names:             num(prevLocal.names)             + num(stats.names),
    sameLetterWords:   num(prevLocal.sameLetterWords)   + num(stats.sameLetterWords),
    switches:          num(prevLocal.switches)          + num(stats.switches),
    linksEarned:       num(prevLocal.linksEarned)       + num(stats.linksEarned),
    linksSpent:        num(prevLocal.linksSpent)        + num(stats.linksSpent),

    // -------- records (max) --------
    highestWordScore:    Math.max(num(prevLocal.highestWordScore),    num(stats.highestWordScore)),
    longestAnimalStreak: Math.max(num(prevLocal.longestAnimalStreak), num(stats.longestAnimalStreak)),
    longestCountryStreak:Math.max(num(prevLocal.longestCountryStreak),num(stats.longestCountryStreak)),
    longestNameStreak:   Math.max(num(prevLocal.longestNameStreak),   num(stats.longestNameStreak)),
    longestChain:        Math.max(num(prevLocal.longestChain),         num(longestChainThisRun), num(stats.longestChain)),
    highestMultiplier:   Math.max(num(prevLocal.highestMultiplier),    num(highestMultThisRun)),

    // -------- session/unique (best-effort) --------
    totalSessions: sessionsNow,
    uniqueWords:   Math.max(num(prevLocal.uniqueWords), num(uniqueWordsThisRun)),
  };

  // Persist local all-time for the stats page if server data isn't available
  persistStats(mergedAllTime);

  // Send per-run summary to server (if signed in)
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

  // 6 missions per category; 6 for main
  const buildCategoryTrack = (chain: ChainKey): Mission[] => {
    const R = 0.5;
    return [
      { id: newId(), owner: chain, chain, kind: "enterChain", target: 1,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo",      target: 2,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult",  target: 1.6, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "scoreWord",  target: 40,  progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo",      target: 3,   progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult",  target: 2.0, progress: 0, reward: R },
    ];
  };
  const buildMainTrack = (): Mission[] => {
    const R = 0.5;
    const seq: ChainKey[] = ["animal", "country", "name"];
    return [
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 1.5, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 120, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "sequence",   sequence: seq, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 2.0, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 300, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame",  target: 2.4, progress: 0, reward: R },
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

  // Current mission index per owner (0..5)
  const [missionIndex, setMissionIndex] = useState<Record<ChainKeyOrMain, number>>({
    main: 0, name: 0, animal: 0, country: 0, food: 0, brand: 0, screen: 0
  });

  // Unlocked tracks (start with only main)
  const allCategories: ChainKey[] = ["name","animal","country","food","brand","screen"];
  const [unlocked, setUnlocked] = useState<Set<ChainKeyOrMain>>(new Set<ChainKeyOrMain>(["main"]));
  const [unlockOrder, setUnlockOrder] = useState<ChainKeyOrMain[]>(["main"]);
  const lockedCategories = useMemo(() => allCategories.filter((c) => !unlocked.has(c)), [unlocked]);

  // Track mission progress for the *current* mission of each owner
  const [missionProgress, setMissionProgress] = useState<Record<string, number>>({}); // key by mission.id
  const currentMissions = useMemo(() => {
    const list: Mission[] = [];
    unlocked.forEach((owner) => {
      const idx = missionIndex[owner] ?? 0;
      const track = missionTracks[owner];
      if (track && idx < track.length) list.push(track[idx]);
    });
    return list;
  }, [unlocked, missionIndex, missionTracks]);

  // Completed mission ids (to pay rewards only once)
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

  // Unique word sets per category and same-letter
  const [uniqueSeen, setUniqueSeen] = useState<Record<PowerKey, Set<string>>>({
    name: new Set(), animal: new Set(), country: new Set(), food: new Set(), brand: new Set(), screen: new Set(), same: new Set()
  });

  const tryGrantChargeUnique = (key: PowerKey, rawWord: string) => {
    const need = POWER_THRESHOLDS[key];
    const wNorm = norm(rawWord);
    setUniqueSeen((cur) => {
      const prevSet = cur[key] ?? new Set<string>();
      if (prevSet.has(wNorm)) return cur; // not unique; do nothing
      const nxSet = new Set(prevSet); nxSet.add(wNorm);
      const newCount = nxSet.size;
      if (need && newCount % need === 0) {
        setPowerCharges((ch) => ({ ...ch, [key]: (ch[key] ?? 0) + 1 }));
        setMsg(`Powerup charged: ${key === "same" ? "Same-Letter" : CHAIN_COLORS[key].label}`);
      }
      return { ...cur, [key]: nxSet };
    });
  };

  const usePower = (key: PowerKey) => {
    setPowerCharges((ch) => {
      if ((ch[key] ?? 0) <= 0) return ch;
      const next = { ...ch, [key]: ch[key] - 1 };

      if (key === "country") {
        setUsed(new Set());
        setMsg("NUKE deployed: you may reuse any previous word.");
      } else if (key === "name") {
        // Freeze until next valid answer
        setPauseUntilAnswer(true);
        setPaused(true);
        setMsg("Timer frozen until your next valid word!");
      } else if (key === "animal") {
        // +20x additive surge until multiplier is lost (lose animal chain or lose life)
        setSurgeActive(true);
        setMsg("Wild Surge active: +20x until you lose your multiplier.");
      } else if (key === "food") {
        setLives((l) => Math.min(5, l + 1));
        setMsg("Extra Life gained! (Max 5)");
      } else if (key === "brand") {
        setNextWordAddBonus((b) => b + 50);
        setMsg("Sponsor Boost armed: +50x on the next word!");
      } else if (key === "screen") {
        // Freeze 15s (doesn't override 'freeze until answer')
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

    // reset run analytics
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
      // If we just lost the animal chain multiplier due to switching without link, end surge
      if (leaving.has("animal")) setSurgeActive(false);
    }
    setStats((s) => ({ ...s, switches: s.switches + 1 }));
    return next;
  };

  /** ===================== Validation ===================== */
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

  /** ===================== Submit ===================== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (input?.value || "").trim();
    if (!raw) return;

    // debug: "?word"
    if (raw.startsWith("?")) {
      const test = raw.slice(1);
      const cats = Array.from(getCategories(test));
      console.log("DEBUG cats for", test, "=>", cats);
      setMsg(`Debug: ${test} → ${cats.join(", ") || "none"}`);
      input.value = "";
      return;
    }

    const w = raw;
    input.value = "";

    if (used.has(w.toLowerCase())) { setMsg("Already used."); return; }
    if (last !== "start") {
      if (firstLetter(w) !== lastLetter(last)) { loseLife("Invalid entry"); setMsg(`Must start with “${lastLetter(last)}”.`); return; }
      if (!w.toLowerCase().includes(firstLetter(last))) { loseLife("Invalid entry"); setMsg(`Must include “${firstLetter(last)}”.`); return; }
    }
    const ok = await validateWord(w);
    if (!ok) { loseLife("Invalid entry"); setMsg("Not an official word."); return; }

    // if we were frozen until next answer, release it now
    if (pauseUntilAnswer) {
      setPauseUntilAnswer(false);
      setPaused(false);
    }

    // === timing: average ms/word for this run ===
    const now = Date.now();
    if (lastAcceptAtRef.current != null) {
      const dt = now - lastAcceptAtRef.current;
      if (Number.isFinite(dt) && dt > 0 && dt < 10 * 60 * 1000) {
        deltasRef.current.push(dt); // cap 10 min to ignore AFK
      }
    }
    lastAcceptAtRef.current = now;

    // === uninterrupted chain across ANY category ===
    currentChainRef.current += 1;
    if (currentChainRef.current > maxChainRef.current) {
      maxChainRef.current = currentChainRef.current;
    }

    // same-letter & unique credit
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
      tryGrantChargeUnique(k, w); // unique per category
    });
    next = applySwitching(enteringCats, next);
    setChains(next);
    setPrevCats(enteringCats);

    // scoring
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
    if (nextWordAddBonus !== 0) setNextWordAddBonus(0);

    // stats (records & per-category streaks)
    setStats((s) => {
      const upd: Stats = { ...s, totalWords: s.totalWords + 1, highestWordScore: Math.max(s.highestWordScore, gained) };
      if (enteringCats.has("animal")) { upd.animals = s.animals + 1; upd.longestAnimalStreak = Math.max(s.longestAnimalStreak, next.animal.length); }
      if (enteringCats.has("country")) { upd.countries = s.countries + 1; upd.longestCountryStreak = Math.max(s.longestCountryStreak, next.country.length); }
      if (enteringCats.has("name")) { upd.names = s.names + 1; upd.longestNameStreak = Math.max(s.longestNameStreak, next.name.length); }
      return upd;
    });

    // bookkeeping
    setUsed((u) => new Set(u).add(w.toLowerCase()));
    setRecent((r) => [w, ...r].slice(0, 30));
    setLast(w);
    setTimeLeft(30);

    /** ===== Progress the current missions only ===== */
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
            if (current >= (m as any).target) nx[id] = (m as any).target;
          }
          if (m.kind === "combo") nx[id] = inCat ? Math.min((m as any).target, cur + 1) : 0;
          if (m.kind === "scoreWord" && inCat && gained >= (m as any).target) nx[id] = (m as any).target;
          if (m.kind === "validWords" && inCat) nx[id] = Math.min((m as any).target, cur + 1);
        } else {
          if (m.kind === "reachSame") {
            if (sameMult >= (m as any).target) nx[id] = (m as any).target;
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

    const addLinks = 0.5 * justFinished.length;
    if (addLinks > 0) {
      setLinks((x) => { const nx = x + addLinks; setStats((s) => ({ ...s, linksEarned: s.linksEarned + addLinks })); return nx; });
      setMsg(`Mission complete! +${addLinks.toFixed(1)} LINK${addLinks !== 0.5 ? "s" : ""}`);
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
  const totalLevels = 6; // per track
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
            <div className="card space-y-3">
              <div className="text-lg">Score: <b>{score}</b></div>
              <div>Lives: {"❤️".repeat(Math.max(0, lives))}{lives <= 0 && " (none)"} (max 5 with Foods powerup)</div>
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

              <div className="space-y-1 pt-2 text-sm">
                <div>Names: <b>{fmt(chains.name.multiplier)}</b> {chains.name.frozen && "(frozen)"} len {chains.name.length}</div>
                <div>Animals: <b>{fmt(chains.animal.multiplier)}</b> {chains.animal.frozen && "(frozen)"} len {chains.animal.length}</div>
                <div>Countries: <b>{fmt(chains.country.multiplier)}</b> {chains.country.frozen && "(frozen)"} len {chains.country.length}</div>
                <div>Foods: <b>{fmt(chains.food.multiplier)}</b> {chains.food.frozen && "(frozen)"} len {chains.food.length}</div>
                <div>Brands: <b>{fmt(chains.brand.multiplier)}</b> {chains.brand.frozen && "(frozen)"} len {chains.brand.length}</div>
                <div>TV/Movies: <b>{fmt(chains.screen.multiplier)}</b> {chains.screen.frozen && "(frozen)"} len {chains.screen.length}</div>
                <div>Same-Letter Bonus: <b>{fmt(sameMult)}</b></div>
              </div>
            </div>

            {/* Input & recent */}
            <div className="card md:col-span-1">
              <div className="text-sm text-gray-500">Last word: <b className="break-words">{last === "start" ? "—" : last}</b></div>
              <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
                <input name="word" placeholder="Enter a word" className="flex-1 rounded-xl border p-3 break-words" autoFocus />
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

            {/* Right column: Active missions & Powerups */}
            <div className="md:col-span-1 space-y-4">
              {/* Missions: one active per unlocked track */}
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

                    // If completed, show blocked panel
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

                    // Active current mission card (single)
                    const m = track[idx];
                    if (!m) return null;
                    const id = m.id;
                    const progressCurrent =
                      m.owner === "main" && (m as any).kind === "sequence"
                        ? (missionProgress[id] ?? 0)
                        : (missionProgress[id] ?? 0);
                    const target =
                      m.owner === "main" && (m as any).kind === "sequence"
                        ? (m as any).sequence.length
                        : (m as any).target;
                    const bar = Math.min(100, (progressCurrent / target) * 100);

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
                            <span className="ml-2 text-xs text-gray-600">— Reward: <b>0.5</b> LINK</span>
                          </span>

                          <div className="min-w-[120px] text-right text-xs text-gray-600">
                            {progressCurrent}/{target}
                            <div className="mt-1 h-1.5 w-32 rounded bg-gray-200 overflow-hidden">
                              <div className="h-1.5 bg-black/60" style={{ width: `${bar}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Locked hint */}
                  {lockedCategories.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <b>{lockedCategories.length}</b> categor{lockedCategories.length === 1 ? "y is" : "ies are"} locked — finish the Level 1 mission of the latest unlocked category to reveal the next.
                    </div>
                  )}
                </div>
              </div>

              {/* Powerups */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Powerups</h3>
                  <div className="text-sm text-gray-500">+1 charge per threshold of <b>unique</b> words</div>
                </div>
                <div className="space-y-2">
                  {(() => { const p = powerProgress("country"); return (
                    <PowerRow
                      label="NUKE (Countries)"
                      charges={powerCharges.country}
                      onUse={() => usePower("country")}
                      borderClass="border-purple-300"
                      fillClass={CHAIN_COLORS.country.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("name"); return (
                    <PowerRow
                      label="Freeze until next answer (Names)"
                      charges={powerCharges.name}
                      onUse={() => usePower("name")}
                      borderClass="border-blue-300"
                      fillClass={CHAIN_COLORS.name.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("animal"); return (
                    <PowerRow
                      label="Wild Surge +20x (Animals)"
                      charges={powerCharges.animal}
                      onUse={() => usePower("animal")}
                      borderClass="border-green-300"
                      fillClass={CHAIN_COLORS.animal.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("food"); return (
                    <PowerRow
                      label="Extra Life (Foods, max 5)"
                      charges={powerCharges.food}
                      onUse={() => usePower("food")}
                      borderClass="border-amber-300"
                      fillClass={CHAIN_COLORS.food.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("brand"); return (
                    <PowerRow
                      label="Sponsor Boost +50x next word (Brands)"
                      charges={powerCharges.brand}
                      onUse={() => usePower("brand")}
                      borderClass="border-rose-300"
                      fillClass={CHAIN_COLORS.brand.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("screen"); return (
                    <PowerRow
                      label="Montage: freeze 15s (TV/Movies)"
                      charges={powerCharges.screen}
                      onUse={() => usePower("screen")}
                      borderClass="border-teal-300"
                      fillClass={CHAIN_COLORS.screen.badge}
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                  {(() => { const p = powerProgress("same"); return (
                    <PowerRow
                      label="Mirror Charm +10x next word (Same-Letter)"
                      charges={powerCharges.same}
                      onUse={() => usePower("same")}
                      borderClass="border-gray-300"
                      fillClass="bg-gray-300"
                      progress={`${p.cur}/${p.need}`}
                      pct={(p.cur / p.need) * 100}
                    />
                  );})()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Small helper component for powerup rows */
function PowerRow({
  label,
  charges,
  onUse,
  borderClass,
  fillClass,
  progress,
  pct,
}: {
  label: string;
  charges: number;
  onUse: () => void;
  borderClass?: string;
  fillClass?: string; // e.g. CHAIN_COLORS[cat].badge
  progress?: string;  // "7/10"
  pct?: number;       // 0..100
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-2 ${borderClass || "border-gray-200"}`}>
      <div className="text-sm">
        <div>{label}</div>
        {progress && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
            <span>Progress: {progress}</span>
            <div className="h-1.5 w-28 rounded bg-gray-200 overflow-hidden">
              <div className={`h-1.5 ${fillClass || "bg-black/60"}`} style={{ width: `${Math.min(100, Math.max(0, Math.round(pct || 0))) }%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Charges: <b>{charges}</b></span>
        <button className="btn btn-sm" disabled={charges <= 0} onClick={onUse}>Use</button>
      </div>
    </div>
  );
}
