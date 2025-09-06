"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ===================== Types & constants ===================== */
type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";
type ChainKeyOrMain = ChainKey | "main";
type ChainState = { length: number; multiplier: number; frozen: boolean };

const letters = "abcdefghijklmnopqrstuvwxyz";
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
// Accept letters, spaces, apostrophes, hyphens, ampersands, and dots
const INPUT_RE = /^[a-zA-Z][a-zA-Z\s'\-&.]*$/;

// Normalize: lowercase, strip spaces/hyphens/apostrophes/&/., remove ™/®/© and diacritics.
const stripDiacritics = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[\s'\-&.]/g, "");

// Very light plural handling for foods/brands (like animals plural)
const singularize = (w: string) => {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
};

// Strip common corporate suffixes/stopwords for brand matching
const stripCorpSuffixes = (s: string) =>
  s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();

// animals plural support (raw list)
function isAnimal(animals: Set<string>, w: string) {
  if (animals.has(w)) return true;
  if (w.endsWith("es") && animals.has(w.slice(0, -2))) return true;
  if (w.endsWith("s") && animals.has(w.slice(0, -1))) return true;
  return false;
}

/** Color map for missions (including Main) */
const CHAIN_COLORS: Record<
  ChainKeyOrMain,
  { badge: string; border: string; text: string; label: string }
> = {
  main:   { badge: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-800",   label: "Main" },
  name:   { badge: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-800",   label: "Names" },
  animal: { badge: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  label: "Animals" },
  country:{ badge: "bg-purple-100", border: "border-purple-400", text: "text-purple-800", label: "Countries" },
  food:   { badge: "bg-amber-100",  border: "border-amber-400",  text: "text-amber-900",  label: "Foods" },
  brand:  { badge: "bg-rose-100",   border: "border-rose-400",   text: "text-rose-800",   label: "Brands" },
  screen: { badge: "bg-teal-100",   border: "border-teal-400",   text: "text-teal-900",   label: "TV/Movies" },
};

export default function WordChains() {
  /** ===================== Data sets ===================== */
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [animals, setAnimals] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Set<string>>(new Set());
  const [foods, setFoods] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [screens, setScreens] = useState<Set<string>>(new Set());

  // normalized sets (preprocessed)
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

      // raw sets (lowercased)
      setDict(new Set((d ?? []).map((x) => x.toLowerCase())));
      setAnimals(new Set((a ?? []).map((x) => x.toLowerCase())));
      setCountries(new Set((c ?? []).map((x) => x.toLowerCase())));
      setNames(new Set((n ?? []).map((x) => x.toLowerCase())));
      setFoods(new Set((f ?? []).map((x) => x.toLowerCase())));
      setBrands(new Set((b ?? []).map((x) => x.toLowerCase())));
      setScreens(new Set((s ?? []).map((x) => x.toLowerCase())));

      // normalized sets
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
  const [links, setLinks] = useState(0); // only for freezing chains on switch
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // post-game leaderboard prompt
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [playerName, setPlayerName] = useState("");

  // Stats (kept minimal; extend as needed)
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
  const persistStats = (s: Stats) =>
    localStorage.setItem("wc_stats", JSON.stringify(s));

  const [sameMult, setSameMult] = useState(1);
  const [chains, setChains] = useState<Record<ChainKey, ChainState>>({
    name: { length: 0, multiplier: 1, frozen: false },
    animal: { length: 0, multiplier: 1, frozen: false },
    country: { length: 0, multiplier: 1, frozen: false },
    food: { length: 0, multiplier: 1, frozen: false },
    brand: { length: 0, multiplier: 1, frozen: false },
    screen: { length: 0, multiplier: 1, frozen: false },
  });

  const totalMult = useMemo(() => {
    const sum =
      chains.name.multiplier +
      chains.animal.multiplier +
      chains.country.multiplier +
      chains.food.multiplier +
      chains.brand.multiplier +
      chains.screen.multiplier;
    return Math.max(1, sum + (sameMult - 1));
  }, [chains, sameMult]);

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

      // foods: accept plural/normalized
      if (
        foods.has(lw) ||
        foodsNorm.has(nw) ||
        foods.has(lwSing) ||
        foodsNorm.has(nwSing)
      )
        set.add("food");

      // brands: accept normalized + suffix-stripped variant
      if (
        brands.has(lw) ||
        brandsNorm.has(nw) ||
        brandsNorm.has(brandForm)
      )
        set.add("brand");

      if (screens.has(lw) || screensNorm.has(nw)) set.add("screen");

      return set;
    },
    [
      animals,
      animalsNorm,
      countries,
      countriesNorm,
      names,
      namesNorm,
      foods,
      foodsNorm,
      brands,
      brandsNorm,
      screens,
      screensNorm,
    ]
  );

  const [prevCats, setPrevCats] = useState<Set<ChainKey>>(new Set());

  /** ===================== Timer handling ===================== */
  useEffect(() => {
  if (!started || paused) return;
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);

  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
}, [started, last, paused]);


 useEffect(() => {
  if (paused && timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}, [paused]);


  useEffect(() => {
    if (started && timeLeft <= 0) loseLife("Time's up!");
  }, [timeLeft, started]);

  const loseLife = (why: string) => {
    setLives((l) => {
      const n = l - 1;
      if (n <= 0) endGame(why);
      else {
        setMsg(`${why} – you lost a life`);
        setTimeLeft(30); // reset to 30s
      }
      return n;
    });
  };
  const endGame = (reason: string) => {
    setStarted(false);
    setMsg(`Game over: ${reason}`);
    setShowNamePrompt(true);
    setFinalScore(score);
    persistStats(stats);
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
    | {
        id: string;
        owner: ChainKey;           // category tracks
        chain: ChainKey;           // same as owner for clarity
        kind: MissionKindCat;
        target: number;
        progress: number;
        reward: number; // fixed 0.5
      }
    | {
        id: string;
        owner: "main";             // main track
        chain: "main";
        kind: "reachSame" | "totalScore";
        target: number;            // numeric target (xSame multiplier or total score)
        progress: number;          // numeric progress
        reward: number;            // fixed 0.5
      }
    | {
        id: string;
        owner: "main";
        chain: "main";
        kind: "sequence";
        sequence: ChainKey[];      // e.g., ["animal","country","name"]
        progress: number;          // index in sequence
        reward: number;
      };

  const newId = () =>
    (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  /** Build progressively harder category tracks (10 missions each) */
  const buildCategoryTrack = (chain: ChainKey): Mission[] => {
    const R = 0.5;
    return [
      { id: newId(), owner: chain, chain, kind: "enterChain", target: 1, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "enterChain", target: 2, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo", target: 3, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult", target: 1.6, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "scoreWord", target: 40, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "enterChain", target: 5, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo", target: 4, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "reachMult", target: 2.0, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "scoreWord", target: 70, progress: 0, reward: R },
      { id: newId(), owner: chain, chain, kind: "combo", target: 5, progress: 0, reward: R },
    ];
  };

  /** Build the Main track (10 missions): same-letter, total score, sequences */
  const buildMainTrack = (): Mission[] => {
    const R = 0.5;
    const seq: ChainKey[] = ["animal", "country", "name"];
    const seq2: ChainKey[] = ["food", "brand", "screen"];
    return [
      { id: newId(), owner: "main", chain: "main", kind: "reachSame", target: 1.5, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 100, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "sequence", sequence: seq, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame", target: 2.0, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 250, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "sequence", sequence: seq2, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame", target: 2.4, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 500, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "reachSame", target: 2.8, progress: 0, reward: R },
      { id: newId(), owner: "main", chain: "main", kind: "totalScore", target: 900, progress: 0, reward: R },
    ];
  };

  const missionTracks: Record<ChainKeyOrMain, Mission[]> = {
    main: buildMainTrack(),
    name: buildCategoryTrack("name"),
    animal: buildCategoryTrack("animal"),
    country: buildCategoryTrack("country"),
    food: buildCategoryTrack("food"),
    brand: buildCategoryTrack("brand"),
    screen: buildCategoryTrack("screen"),
  };

  const [missionIndex, setMissionIndex] = useState<Record<ChainKeyOrMain, number>>({
    main: 0,
    name: 0,
    animal: 0,
    country: 0,
    food: 0,
    brand: 0,
    screen: 0,
  });

  // visible missions = exactly one per track (main + all categories) if available
  const [missions, setMissions] = useState<Mission[]>([]);
  useEffect(() => {
    const visible: Mission[] = [];
    (Object.keys(missionTracks) as ChainKeyOrMain[]).forEach((k) => {
      const idx = missionIndex[k] ?? 0;
      const track = missionTracks[k];
      if (track && idx < track.length) visible.push(track[idx]);
    });
    setMissions(visible);
  }, [missionIndex]);

  /** ===================== Start/reset ===================== */
  const resetRun = () => {
    setUsed(new Set());
    setRecent([]);
    setScore(0);
    setLinks(0);
    setLives(3);
    setTimeLeft(30); // 30s
    setMsg("");
    setPaused(false);
    setSameMult(1);
    setChains({
      name: { length: 0, multiplier: 1, frozen: false },
      animal: { length: 0, multiplier: 1, frozen: false },
      country: { length: 0, multiplier: 1, frozen: false },
      food: { length: 0, multiplier: 1, frozen: false },
      brand: { length: 0, multiplier: 1, frozen: false },
      screen: { length: 0, multiplier: 1, frozen: false },
    });
    setMissionIndex({
      main: 0,
      name: 0,
      animal: 0,
      country: 0,
      food: 0,
      brand: 0,
      screen: 0,
    });
    setLast(pickStarter());
    setPrevCats(new Set());
    setShowNamePrompt(false);
    setPlayerName("");
  };
  const start = () => {
    setStarted(true);
    resetRun();
  };

  /** ===================== Switching (spend LINKS to freeze leaving chains) ===================== */
  const applySwitching = (enteringCats: Set<ChainKey>, next: Record<ChainKey, ChainState>) => {
    const leaving = new Set<ChainKey>([...prevCats].filter((c) => !enteringCats.has(c)));
    if (leaving.size === 0) return next;
    if (links >= 1) {
      setLinks((l) => {
        setStats((s) => ({ ...s, linksSpent: s.linksSpent + 1 }));
        return Math.max(0, l - 1);
      });
      leaving.forEach((k) => {
        next[k] = { ...next[k], frozen: true };
      });
    } else {
      leaving.forEach((k) => {
        next[k] = { length: 0, multiplier: 1, frozen: false };
      });
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

    // raw or normalized dicts
    if (dict && (dict.has(lw) || dictNorm.has(nw))) return true;

    // countries/names/animals/screens
    if (countries.has(lw) || countriesNorm.has(nw)) return true;
    if (names.has(lw) || namesNorm.has(nw)) return true;
    if (isAnimal(animals, lw) || animalsNorm.has(nw)) return true;
    if (screens.has(lw) || screensNorm.has(nw)) return true;

    // foods: raw, normalized, or naive singular
    if (
      foods.has(lw) ||
      foodsNorm.has(nw) ||
      foods.has(lwSing) ||
      foodsNorm.has(nwSing)
    )
      return true;

    // brands: raw normalized, with corp suffix stripped
    if (
      brands.has(lw) ||
      brandsNorm.has(nw) ||
      brandsNorm.has(brandForm)
    )
      return true;

    return false;
  }

  /** ===================== Submit ===================== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (input?.value || "").trim();
    if (!raw) return;

    // DEBUG helper: type ?word to inspect categories
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

    if (used.has(w.toLowerCase())) {
      setMsg("Already used.");
      return;
    }
    if (last !== "start") {
      if (firstLetter(w) !== lastLetter(last)) {
        loseLife("Invalid entry");
        setMsg(`Must start with “${lastLetter(last)}”.`);
        return;
      }
      if (!w.toLowerCase().includes(firstLetter(last))) {
        loseLife("Invalid entry");
        setMsg(`Must include “${firstLetter(last)}”.`);
        return;
      }
    }
    const ok = await validateWord(w);
    if (!ok) {
      loseLife("Invalid entry");
      setMsg("Not an official word.");
      return;
    }

    // same-letter bonus
    if (w[0].toLowerCase() === w[w.length - 1].toLowerCase()) {
      setSameMult((s) => 1 + (s - 1) + SAME_LETTER_GROWTH);
      setStats((s) => ({ ...s, sameLetterWords: s.sameLetterWords + 1 }));
    } else if (sameMult > 1) setSameMult(1);

    const enteringCats = getCategories(w); // may be multi
    let next = { ...chains };

    // advance all entered chains
    enteringCats.forEach((k) => {
      const c = next[k];
      next[k] = {
        length: c.length + 1,
        multiplier: Math.max(1, c.multiplier + CHAIN_STEP_GROWTH),
        frozen: false,
      };
    });

    // switching logic
    next = applySwitching(enteringCats, next);

    setChains(next);
    setPrevCats(enteringCats);

    // scoring: base = strongest category base among present cats (or normal)
    const categories = Array.from(enteringCats);
    const base = categories.length
      ? Math.max(...categories.map((k) => (CHAIN_BASE as any)[k] ?? 1))
      : CHAIN_BASE.normal;
    const gained = Math.round(w.length * base * totalMult);
    setScore((s) => s + gained);
    setMsg(`+${gained} points (total ${fmt(totalMult)})`);

    // stats (subset)
    setStats((s) => {
      const upd: Stats = {
        ...s,
        totalWords: s.totalWords + 1,
        highestWordScore: Math.max(s.highestWordScore, gained),
      };
      if (enteringCats.has("animal")) {
        upd.animals = s.animals + 1;
        upd.longestAnimalStreak = Math.max(s.longestAnimalStreak, next.animal.length);
      }
      if (enteringCats.has("country")) {
        upd.countries = s.countries + 1;
        upd.longestCountryStreak = Math.max(s.longestCountryStreak, next.country.length);
      }
      if (enteringCats.has("name")) {
        upd.names = s.names + 1;
        upd.longestNameStreak = Math.max(s.longestNameStreak, next.name.length);
      }
      return upd;
    });

    // bookkeeping
    const lw = w.toLowerCase();
    setUsed((u) => new Set(u).add(lw));
    setRecent((r) => [w, ...r].slice(0, 30));
    setLast(w);
    setTimeLeft(30); // keep at 30s between plays

    /** ===== Missions progress (update in-place) ===== */
    setMissions((list) =>
      list.map((m) => {
        // ----- Category missions: only progress on that category -----
        if (m.owner !== "main") {
          const inCat = enteringCats.has(m.chain);
          const copy: any = { ...m };
          if (m.kind === "enterChain" && inCat) {
            copy.progress = Math.min(copy.target, copy.progress + 1);
          }
          if (m.kind === "reachMult") {
            const current = next[m.chain].multiplier;
            if (current >= m.target) copy.progress = m.target;
          }
          if (m.kind === "combo") {
            copy.progress = inCat
              ? Math.min(copy.target, copy.progress + 1)
              : 0; // break combo if we didn't play that category this turn
          }
          if (m.kind === "scoreWord") {
            if (inCat && gained >= m.target) copy.progress = m.target; // must be that category
          }
          if (m.kind === "validWords" && inCat) {
            copy.progress = Math.min(copy.target, copy.progress + 1);
          }
          return copy;
        }

        // ----- Main missions -----
        const copy: any = { ...m };
        if (m.kind === "reachSame") {
          if (sameMult >= m.target) copy.progress = m.target;
        } else if (m.kind === "totalScore") {
          copy.progress = Math.min(m.target, (copy.progress || 0) + gained);
        } else if (m.kind === "sequence") {
          const seq = m.sequence;
          const idx = m.progress || 0;
          const need = seq[idx];
          const matched = need ? enteringCats.has(need) : false;
          if (matched) {
            copy.progress = idx + 1;
          } else {
            copy.progress = enteringCats.has(seq[0]) ? 1 : 0;
          }
        }
        return copy;
      })
    );
  };

  /** ===== When missions change, advance finished ones & grant rewards (fixed +0.5 each) ===== */
  useEffect(() => {
    if (!missions.length) return;
    const finished = missions.filter((m) => {
      if (m.owner === "main" && m.kind === "sequence") {
        return m.progress >= (m.sequence?.length || 0);
      }
      return (m as any).progress >= (m as any).target;
    });
    if (!finished.length) return;

    const add = 0.5 * finished.length; // fixed reward per mission
    setLinks((x) => {
      const nx = x + add;
      setStats((s) => ({ ...s, linksEarned: s.linksEarned + add }));
      return nx;
    });

    // advance each finished mission's track (including main)
    finished.forEach((m) => {
      const owner = m.owner;
      setMissionIndex((idx) => {
        const cur = idx[owner] ?? 0;
        const maxLen = missionTracks[owner].length;
        return { ...idx, [owner]: Math.min(cur + 1, maxLen) };
      });
    });

    setMsg(
      `Mission complete! +${add.toFixed(1)} LINK${add !== 0.5 ? "s" : ""}`
    );
  }, [missions]); // missionIndex refreshes visible missions via effect above

  /** ===================== UI ===================== */
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Post-game leaderboard prompt */}
      {showNamePrompt && (
        <div className="md:col-span-3 card flex flex-col gap-3 border border-dashed border-gray-300">
          <h3 className="text-xl font-semibold">Submit your score</h3>
          <div className="text-sm text-gray-600">
            Final Score: <b>{finalScore}</b>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={submitScore}>
              Submit to Leaderboard
            </button>
            <button className="btn" onClick={() => setShowNamePrompt(false)}>
              Dismiss
            </button>
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
            <input
              type="checkbox"
              checked={strictDictionary}
              onChange={(e) => setStrictDictionary(e.target.checked)}
            />
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
            <div className="text-lg">
              Score: <b>{score}</b>
            </div>
            <div>Lives: {"❤️".repeat(Math.max(0, lives))}{lives <= 0 && " (none)"}</div>

            <div className="flex items-center gap-2">
              <div>Time Left: {timeLeft}s</div>
              <button className="btn btn-sm" onClick={() => setPaused((p) => !p)}>
                {paused ? "Resume" : "Pause"}
              </button>
            </div>

            <div>LINKS: {Number(links).toFixed(1)}</div>
            <div className="text-sm">
              Total Multiplier: <b>{fmt(totalMult)}</b>
            </div>
            <div className="space-y-1 pt-2 text-sm">
              <div>
                Names: <b>{fmt(chains.name.multiplier)}</b> {chains.name.frozen && "(frozen)"} len {chains.name.length}
              </div>
              <div>
                Animals: <b>{fmt(chains.animal.multiplier)}</b> {chains.animal.frozen && "(frozen)"} len {chains.animal.length}
              </div>
              <div>
                Countries: <b>{fmt(chains.country.multiplier)}</b> {chains.country.frozen && "(frozen)"} len {chains.country.length}
              </div>
              <div>
                Foods: <b>{fmt(chains.food.multiplier)}</b> {chains.food.frozen && "(frozen)"} len {chains.food.length}
              </div>
              <div>
                Brands: <b>{fmt(chains.brand.multiplier)}</b> {chains.brand.frozen && "(frozen)"} len {chains.brand.length}
              </div>
              <div>
                TV/Movies: <b>{fmt(chains.screen.multiplier)}</b> {chains.screen.frozen && "(frozen)"} len {chains.screen.length}
              </div>
              <div>Same-Letter Bonus: <b>{fmt(sameMult)}</b></div>
            </div>
          </div>

          {/* Input & recent */}
          <div className="card md:col-span-1">
            <div className="text-sm text-gray-500">
              Last word: <b className="break-words">{last === "start" ? "—" : last}</b>
            </div>
            <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
              <input
                name="word"
                placeholder="Enter a word"
                className="flex-1 rounded-xl border p-3 break-words"
                autoFocus
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
                    <div
                      key={w + String(i)}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-sm break-words"
                    >
                      <div className="font-medium">{w}</div>
                      {cats.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cats.map((c) => (
                            <span
                              key={c}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${CHAIN_COLORS[c].badge} ${CHAIN_COLORS[c].text}`}
                            >
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

          {/* Missions: one active per track (Main + each category) */}
          <div className="card md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Missions</h3>
              <div className="text-sm text-gray-500">One active per track</div>
            </div>
            <ul className="space-y-2">
              {missions.map((m) => {
                const key = (m as any).owner as ChainKeyOrMain;
                const c = CHAIN_COLORS[key];
                const progressCurrent =
                  m.owner === "main" && m.kind === "sequence"
                    ? m.progress
                    : (m as any).progress || 0;
                const progressTarget =
                  m.owner === "main" && m.kind === "sequence"
                    ? (m as any).sequence.length
                    : (m as any).target || 1;
                const percent = Math.min(100, (progressCurrent / progressTarget) * 100);

                return (
                  <li
                    key={m.id}
                    className={`flex items-center justify-between gap-3 border-l-4 ${c.border} pl-3`}
                  >
                    <span className="text-sm flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge} ${c.text}`}>
                        {c.label}
                      </span>
                      <span className="break-words">
                        {/* Category missions wording */}
                        {m.owner !== "main" && (
                          <>
                            {(m as any).kind === "enterChain" && (
                              <>Get <b>{(m as any).target}</b> {(c.label).toLowerCase()} word{(m as any).target > 1 ? "s" : ""}</>
                            )}
                            {(m as any).kind === "reachMult" && (
                              <>Reach <b>{c.label}</b> multiplier of <b>x{Number((m as any).target).toFixed(2)}</b></>
                            )}
                            {(m as any).kind === "combo" && (
                              <>Chain <b>{(m as any).target}</b> consecutive <b>{c.label}</b> words</>
                            )}
                            {(m as any).kind === "scoreWord" && (
                              <>Score <b>{(m as any).target}</b> with a <b>{c.label}</b> word</>
                            )}
                            {(m as any).kind === "validWords" && (
                              <>Play <b>{(m as any).target}</b> valid <b>{c.label}</b> words</>
                            )}
                          </>
                        )}

                        {/* Main mission wording */}
                        {m.owner === "main" && (
                          <>
                            {m.kind === "reachSame" && (
                              <>Reach <b>Same-Letter</b> multiplier of <b>x{Number(m.target).toFixed(2)}</b></>
                            )}
                            {m.kind === "totalScore" && (
                              <>Reach a total score of <b>{m.target}</b></>
                            )}
                            {m.kind === "sequence" && (
                              <>
                                Sequence:&nbsp;
                                <b>{m.sequence.map((x) => CHAIN_COLORS[x].label).join(" → ")}</b>
                              </>
                            )}
                          </>
                        )}

                        <span className="ml-2 text-xs text-gray-600">— Reward: <b>0.5</b> LINK</span>
                      </span>
                    </span>

                    {/* Progress & bar */}
                    <div className="min-w-[90px] text-right text-xs text-gray-600">
                      {progressCurrent}/{progressTarget}
                      <div className="mt-1 h-1.5 w-24 rounded bg-gray-200 overflow-hidden">
                        <div className="h-1.5 bg-black/60" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
