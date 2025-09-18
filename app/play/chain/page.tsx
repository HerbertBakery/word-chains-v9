// app/play/chain/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

import ChainLeaderboard from "./ChainLeaderboard";

/* ===================== Chain Mode constants ===================== */
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
const SAME_LETTER_GROWTH = 0.2;

/* Skips: start with 1, cap at 2; award +1 for every 3 CORRECT IN A ROW */
const SKIP_START = 1;
const SKIP_STREAK_FOR_AWARD = 3;
const SKIP_MAX = 2;

const fmt = (x: number) => `x${x.toFixed(2)}`;

type ChainState = { length: number; multiplier: number };

export default function ChainMode() {
  const { play } = useSound();
  const vfx = useVFX();

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

  // Skips & streak logic
  const [skips, setSkips] = useState(SKIP_START);
  const [correctStreak, setCorrectStreak] = useState(0); // resets on any invalid submit or skip

  // 15s per-answer timer
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaderboard UI (inline)
  const [showBoard, setShowBoard] = useState(false);

  // Active category
  const ALL: ChainKey[] = ["name", "animal", "country", "food", "brand", "screen"];
  const [category, setCategory] = useState<ChainKey>("animal");

  // Scoring/multipliers
  const [sameMult, setSameMult] = useState(1);
  const [chains, setChains] = useState<Record<ChainKey, ChainState>>({
    name: { length: 0, multiplier: 1 },
    animal: { length: 0, multiplier: 1 },
    country: { length: 0, multiplier: 1 },
    food: { length: 0, multiplier: 1 },
    brand: { length: 0, multiplier: 1 },
    screen: { length: 0, multiplier: 1 },
  });

  const catSum =
    chains.name.multiplier +
    chains.animal.multiplier +
    chains.country.multiplier +
    chains.food.multiplier +
    chains.brand.multiplier +
    chains.screen.multiplier;
  const totalMult = Math.max(1, catSum) * sameMult;

  /* ===================== Helpers ===================== */
  const pickStarter = useCallback(() => {
    if (!dict) return "start";
    const arr = Array.from(dict);
    for (let i = 0; i < 500; i++) {
      const c = arr[Math.floor(Math.random() * arr.length)];
      if (c.length >= 4 && c.length <= 7) return c;
    }
    return "start";
  }, [dict]);

  const nextCategory = useCallback(() => {
    const n = ALL[Math.floor(Math.random() * ALL.length)];
    setCategory(n);
  }, []);

  const resetRun = useCallback(() => {
    setIsOver(false);
    setUsed(new Set());
    setScore(0);
    setSameMult(1);
    setChains({
      name: { length: 0, multiplier: 1 },
      animal: { length: 0, multiplier: 1 },
      country: { length: 0, multiplier: 1 },
      food: { length: 0, multiplier: 1 },
      brand: { length: 0, multiplier: 1 },
      screen: { length: 0, multiplier: 1 },
    });
    setSkips(SKIP_START);
    setCorrectStreak(0);
    setShowBoard(false);
    setLast(pickStarter());
    nextCategory();
    setTimeLeft(15);
  }, [pickStarter, nextCategory]);

  const start = () => {
    setStarted(true);
    resetRun();
  };

  /* ===================== Timer loop ===================== */
  useEffect(() => {
    if (!started || isOver) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started, isOver]);

  useEffect(() => {
    if (!started || isOver) return;
    if (timeLeft === 0) {
      setIsOver(true);
      try { play("gameover"); } catch {}
    }
  }, [timeLeft, started, isOver, play]);

  /* ===================== Auto-submit score on game over ===================== */
  const postedRef = useRef(false);
  async function submitChainRunAuto(finalScore: number, longestChain: number) {
    try {
      const r = await fetch("/api/chain/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: finalScore, longestChain }),
      });
      return r.ok;
    } catch {
      return false;
    }
  }
  useEffect(() => {
    if (!started || !isOver) return;
    if (postedRef.current) return;
    postedRef.current = true;
    void submitChainRunAuto(score, used.size);
  }, [started, isOver, score, used.size]);

  /* ===================== Skip ===================== */
  const doSkip = useCallback(() => {
    if (isOver || !started) return;
    if (skips <= 0) return;
    setSkips((s) => Math.max(0, s - 1));
    setCorrectStreak(0); // skip breaks streak
    try { play("coin", { volume: 0.9 }); } catch {}
    setLast(pickStarter());
    nextCategory();
    setTimeLeft(15);
  }, [isOver, started, skips, play, pickStarter, nextCategory]);

  /* ===================== Typing SFX ===================== */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onKeyDownSFX = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOver) return;
      if (e.key.length === 1 && /^[a-zA-Z0-9' -]$/.test(e.key)) {
        try { play("typing", { volume: 0.7 }); } catch {}
      }
    },
    [isOver, play]
  );

  /* ===================== Word accept routine ===================== */
  const grantSkipIfStreakMet = useCallback(() => {
    setCorrectStreak((prev) => {
      const next = prev + 1;
      if (next >= SKIP_STREAK_FOR_AWARD) {
        // Award exactly +1, capped at SKIP_MAX, then reset streak to 0
        setSkips((s) => Math.min(SKIP_MAX, s + 1));
        return 0;
      }
      return next;
    });
  }, []);

  const breakStreak = useCallback(() => {
    setCorrectStreak(0);
  }, []);

  const applyAcceptedWord = useCallback(
    (w: string) => {
      const wl = w.toLowerCase();

      // same-letter bonus
      const same = w[0].toLowerCase() === w[w.length - 1].toLowerCase();
      if (same) setSameMult((s) => 1 + (s - 1) + SAME_LETTER_GROWTH);
      else if (sameMult > 1) setSameMult(1);

      // grow multipliers per categories
      const enteringCats = getCategories(w);
      setChains((prev) => {
        const next = { ...prev };
        enteringCats.forEach((k) => {
          const c = next[k];
          next[k] = { length: c.length + 1, multiplier: Math.max(1, c.multiplier + CHAIN_STEP_GROWTH) };
        });
        return next;
      });

      // scoring
      const catsArr = Array.from(enteringCats);
      const base = catsArr.length ? Math.max(...catsArr.map((k) => (CHAIN_BASE as any)[k] ?? 1)) : CHAIN_BASE.normal;
      const gained = Math.round(w.length * base * Math.max(1, totalMult));
      setScore((s) => s + gained);

      try { play("accept"); } catch {}
      try { vfx.ringBurstAtFromEl("input[name='word']"); } catch {}

      setUsed((u) => new Set(u).add(wl));
      setLast(w);
      setTimeLeft(15);
      nextCategory();

      // streak-based skip award
      grantSkipIfStreakMet();
    },
    [getCategories, nextCategory, play, vfx, totalMult, sameMult, grantSkipIfStreakMet]
  );

  /* ===================== Form submit ===================== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).word as unknown as HTMLInputElement;
    const raw = (input?.value || "").trim();
    if (!raw) return;
    const w = raw;
    const wl = w.toLowerCase();
    input.value = "";

    // already used
    if (used.has(wl)) {
      breakStreak();
      try { play("used"); } catch {}
      try { vfx.shake("input[name='word']", 300); } catch {}
      return;
    }

    // classic link rule
    if (last !== "start") {
      if (w[0].toLowerCase() !== lastLetter(last).toLowerCase()) {
        breakStreak();
        try { play("invalid"); } catch {}
        try { vfx.shake("input[name='word']", 300); } catch {}
        return;
      }
      if (!w.toLowerCase().includes(firstLetter(last).toLowerCase())) {
        breakStreak();
        try { play("invalid"); } catch {}
        try { vfx.shake("input[name='word']", 300); } catch {}
        return;
      }
    }

    // must match current category
    const cats = detectors.getCategories(w);
    if (!cats.has(category)) {
      breakStreak();
      try { play("invalid"); } catch {}
      try { vfx.glowOnce(".rounded-2xl.border.p-5"); } catch {}
      return;
    }

    // dictionary / validation
    const ok = await validateWord(w);
    if (!ok) {
      breakStreak();
      try { play("invalid"); } catch {}
      try { vfx.shake("input[name='word']", 300); } catch {}
      return;
    }

    applyAcceptedWord(w);
  };

  /* ===================== UI ===================== */
  return (
    <VfxProvider>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chain Mode</h1>
          <Link href="/play" className="text-sm underline opacity-80 hover:opacity-100">
            ← All Modes
          </Link>
        </div>

        {/* Intro / Start */}
        {!started && !isOver && (
          <div className="rounded-2xl border p-6">
            <p className="mb-3 text-gray-600">
              You have <b>15s</b> per word. Follow the same link + dictionary rules as Classic.
              You can’t reuse words. Start with <b>1 skip</b>; earn another after <b>3 correct
              answers in a row</b> (max 2).
            </p>

            <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={strictDictionary}
                onChange={(e) => setStrictDictionary(e.target.checked)}
              />
              Strict dictionary validation
            </label>

            {!dict && (
              <div className="w-full max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-gray-800 transition-all" style={{ width: `${loadPct}%` }} />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {loadMsg} — {loadPct}%
                </div>
              </div>
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
          <div className="space-y-6">
            {/* Timer */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide opacity-70">Time Left</span>
                <span className="text-lg font-semibold tabular-nums">{timeLeft}s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 15) * 100))}%` }}
                />
              </div>
            </div>

            {/* Current objective */}
            <div className="rounded-2xl border p-5">
              <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Current Category</div>
              <div className="text-2xl font-bold capitalize">{category}</div>
              <div className="mt-2 text-sm opacity-70">
                Last word:&nbsp;<span className="font-semibold">{last === "start" ? "—" : last}</span>
              </div>
            </div>

            {/* Input row + Skip */}
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                name="word"
                placeholder="Type your next word…"
                className="grow rounded-2xl border px-4 py-3 outline-none ring-0 focus:border-black"
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
                  skips > 0 ? "bg-indigo-600 text-white" : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
                title={skips > 0 ? "Skip this category and get a new starter" : "No skips available"}
              >
                Skip ({skips})
              </button>
            </form>

            {/* HUD */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide opacity-70">Score</div>
                <div className="text-2xl font-bold tabular-nums">{score}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide opacity-70">Words Played</div>
                <div className="text-2xl font-bold tabular-nums">{Math.max(0, used.size)}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide opacity-70">Same-Letter Bonus</div>
                <div className="text-2xl font-bold">{fmt(sameMult)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Run over: stats + inline leaderboard toggle */}
        {isOver && (
          <div className="rounded-2xl border p-6 text-center">
            <h2 className="mb-1 text-xl font-bold">Run Over</h2>
            <p className="opacity-80">Your score has been submitted.</p>

            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-4 text-left">
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide opacity-70">Words Played</div>
                <div className="text-2xl font-bold tabular-nums">{used.size}</div>
              </div>
              <div className="rounded-2xl border p-4">
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
              <button
                onClick={() => setShowBoard(true)}
                className="rounded-2xl border px-5 py-3 hover:bg-slate-50"
              >
                View Leaderboard
              </button>
              <Link href="/play" className="rounded-2xl border px-5 py-3 hover:bg-slate-50">
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
