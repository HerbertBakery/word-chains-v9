// app/stats/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Stats = {
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
  powerups?: Record<string, number>;
  // all-time bests/aggregates (server or local fallbacks)
  bestScore?: number;
  longestChain?: number;
  highestMultiplier?: number;
  totalSessions?: number;
  uniqueWords?: number;
  badges?: number;
  perCategoryCounts?: Record<string, number>;
};

// ---- Category registry
const CATEGORY_SOURCES: Array<{
  key: string;
  label: string;
  path: string;
  statsKey: keyof Stats;
}> = [
  { key: "animals",   label: "Animals",   path: "/wordchains/animals.json",   statsKey: "animals" },
  { key: "countries", label: "Countries", path: "/wordchains/countries.json", statsKey: "countries" },
  { key: "names",     label: "Names",     path: "/wordchains/names.json",     statsKey: "names" },
];

type BadgeTier = {
  label: string;
  icon: string;
  requirement: (s: Stats, totals: Record<string, number | null>) =>
    { current: number; target: number; achieved: boolean; hint?: string };
};
type Badge = {
  id: string;
  name: string;
  description: string;
  tiers: BadgeTier[];
};

// Tougher thresholds requested
const BADGES: Badge[] = [
  {
    id: "word_hunter",
    name: "Word Hunter",
    description: "Lifetime total valid words.",
    tiers: [
      { label: "Novice",   icon: "🐣", requirement: (s) => ({ current: s.totalWords ?? 0, target: 100,   achieved: (s.totalWords ?? 0) >= 100 }) },
      { label: "Explorer", icon: "🔍", requirement: (s) => ({ current: s.totalWords ?? 0, target: 500,   achieved: (s.totalWords ?? 0) >= 500 }) },
      { label: "Scholar",  icon: "📚", requirement: (s) => ({ current: s.totalWords ?? 0, target: 1000,  achieved: (s.totalWords ?? 0) >= 1000 }) },
      { label: "Legend",   icon: "👑", requirement: (s) => ({ current: s.totalWords ?? 0, target: 10000, achieved: (s.totalWords ?? 0) >= 10000 }) },
    ],
  },
  {
    id: "animal_kingdom",
    name: "Animal Kingdom",
    description: "Collect animals like a Pokedex.",
    tiers: [
      { label: "Zookeeper",  icon: "🦓", requirement: (s) => ({ current: s.animals ?? 0, target: 25,  achieved: (s.animals ?? 0) >= 25 }) },
      { label: "Biologist",  icon: "🧪", requirement: (s) => ({ current: s.animals ?? 0, target: 100, achieved: (s.animals ?? 0) >= 100 }) },
      {
        label: "Explorer",
        icon: "🌍",
        requirement: (s, totals) => {
          const total = totals.animals ?? null;
          const cur = s.animals ?? 0;
          if (!total || total <= 0) return { current: cur, target: 0, achieved: false, hint: "Add /wordchains/animals.json to enable % progress" };
          const target = Math.ceil(total * 0.5);
          return { current: cur, target, achieved: cur >= target, hint: `50% of ${total}` };
        },
      },
      {
        label: "Paleontologist",
        icon: "🦕",
        requirement: (s, totals) => {
          const total = totals.animals ?? null;
          const cur = s.animals ?? 0;
          if (!total || total <= 0) return { current: cur, target: 0, achieved: false, hint: "Add /wordchains/animals.json to enable ALL progress" };
          const target = total;
          return { current: cur, target, achieved: cur >= target, hint: `All ${total}` };
        },
      },
    ],
  },
  {
    id: "world_traveler",
    name: "World Traveler",
    description: "Name countries across the globe.",
    tiers: [
      { label: "Tourist",      icon: "🧳", requirement: (s) => ({ current: s.countries ?? 0, target: 20,  achieved: (s.countries ?? 0) >= 20 }) },
      { label: "Nomad",        icon: "🏕️", requirement: (s) => ({ current: s.countries ?? 0, target: 80,  achieved: (s.countries ?? 0) >= 80 }) },
      { label: "Globetrotter", icon: "✈️", requirement: (s) => ({ current: s.countries ?? 0, target: 150, achieved: (s.countries ?? 0) >= 150 }) },
      {
        label: "Atlas Master",
        icon: "🗺️",
        requirement: (s, totals) => {
          const total = totals.countries ?? null;
          const cur = s.countries ?? 0;
          if (!total || total <= 0) return { current: cur, target: 0, achieved: false, hint: "Add /wordchains/countries.json to enable ALL progress" };
          const target = total;
          return { current: cur, target, achieved: cur >= target, hint: `All ${total}` };
        },
      },
    ],
  },
  {
    id: "chain_master",
    name: "Chain Master",
    description: "Your longest uninterrupted chain.",
    tiers: [
      { label: "Apprentice",  icon: "🔗", requirement: (s) => ({ current: s.longestChain ?? 0, target: 15,  achieved: (s.longestChain ?? 0) >= 15 }) },
      { label: "Expert",      icon: "⛓️", requirement: (s) => ({ current: s.longestChain ?? 0, target: 35,  achieved: (s.longestChain ?? 0) >= 35 }) },
      { label: "Master",      icon: "🛠️", requirement: (s) => ({ current: s.longestChain ?? 0, target: 70,  achieved: (s.longestChain ?? 0) >= 70 }) },
      { label: "Unstoppable", icon: "🚀", requirement: (s) => ({ current: s.longestChain ?? 0, target: 150, achieved: (s.longestChain ?? 0) >= 150 }) },
    ],
  },
  {
    id: "multiplier_maniac",
    name: "Multiplier Maniac",
    description: "Peak multiplier achieved in a run.",
    tiers: [
      { label: "x25 Club",  icon: "2️⃣5️⃣",  requirement: (s) => ({ current: s.highestMultiplier ?? 0, target: 25,  achieved: (s.highestMultiplier ?? 0) >= 25 }) },
      { label: "x50 Club",  icon: "5️⃣0️⃣",  requirement: (s) => ({ current: s.highestMultiplier ?? 0, target: 50,  achieved: (s.highestMultiplier ?? 0) >= 50 }) },
      { label: "x100 Club", icon: "1️⃣0️⃣0️⃣", requirement: (s) => ({ current: s.highestMultiplier ?? 0, target: 100, achieved: (s.highestMultiplier ?? 0) >= 100 }) },
      { label: "x200 Club", icon: "2️⃣0️⃣0️⃣", requirement: (s) => ({ current: s.highestMultiplier ?? 0, target: 200, achieved: (s.highestMultiplier ?? 0) >= 200 }) },
    ],
  },
  {
    id: "link_strategist",
    name: "Link Strategist",
    description: "Earn and spend links like a pro.",
    tiers: [
      { label: "Collector", icon: "🧩", requirement: (s) => ({ current: s.linksEarned ?? 0, target: 25,  achieved: (s.linksEarned ?? 0) >= 25 }) },
      { label: "Investor",  icon: "💠", requirement: (s) => ({ current: s.linksEarned ?? 0, target: 100, achieved: (s.linksEarned ?? 0) >= 100 }) },
      { label: "Tycoon",    icon: "💎", requirement: (s) => ({ current: s.linksEarned ?? 0, target: 250, achieved: (s.linksEarned ?? 0) >= 250 }) },
      { label: "Magnate",   icon: "🏦", requirement: (s) => ({ current: s.linksEarned ?? 0, target: 1000, achieved: (s.linksEarned ?? 0) >= 1000 }) },
    ],
  },
];

async function fetchJSONCount(path: string): Promise<number | null> {
  try {
    const res = await fetch(path, { cache: "force-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") {
      for (const v of Object.values(data)) if (Array.isArray(v)) return v.length;
    }
    return null;
  } catch {
    return null;
  }
}
function pct(num: number, den: number) {
  if (!den || !Number.isFinite(den) || den <= 0) return 0;
  return (num / den) * 100;
}
function formatPct(value: number) {
  return `${Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)).toFixed(1)}%`;
}
const fmtMsPerWord = (ms: number | null | undefined) => {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "—";
  const s = ms / 1000;
  if (s < 1) return `${(s * 1000).toFixed(0)} ms/word`;
  return `${s.toFixed(1)} s/word`;
};

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-200/70 bg-white/70 shadow-sm p-5 ${className}`}>
      {title ? <h2 className="text-lg font-semibold mb-3">{title}</h2> : null}
      {children}
    </div>
  );
}
function KPI({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {hint ? <div className="text-xs text-neutral-400 mt-0.5">{hint}</div> : null}
    </div>
  );
}
function Progress({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden" aria-label="progress">
      <div className="h-2 rounded-full bg-black/80" style={{ width: `${pct < 0 ? 0 : pct > 100 ? 100 : pct}%` }} />
    </div>
  );
}
function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="text-sm text-neutral-700">{label}</div>
      <div className="text-sm font-medium">{right}</div>
    </div>
  );
}
function MetricSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const metrics = [
    { value: "highest_score",      label: "Highest Score" },
    { value: "longest_chain",      label: "Longest Chain" },
    { value: "highest_multiplier", label: "Highest Multiplier" },
    { value: "most_animals",       label: "Most Animals Found" },
    { value: "most_countries",     label: "Most Countries Found" },
    { value: "most_names",         label: "Most Names Found" },
    { value: "most_unique_words",  label: "Most Unique Words" },
    { value: "most_badges",        label: "Most Badges" },
  ];
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-neutral-500">Leaderboard Metric</span>
      <select
        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {metrics.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [statsLocal, setStatsLocal] = useState<Stats | null>(null);
  const [statsServer, setStatsServer] = useState<Stats | null>(null);
  const [metric, setMetric] = useState<string>("highest_score");
  const [totals, setTotals] = useState<Record<string, number | null>>({});
  const [loadingTotals, setLoadingTotals] = useState<boolean>(true);

  // Local analytics stores
  const [sessionSpeeds, setSessionSpeeds] = useState<number[]>([]);
  const [peakMultipliers, setPeakMultipliers] = useState<number[]>([]);
  const [localSessionsCount, setLocalSessionsCount] = useState<number>(0);

  // Load local backup & analytics
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wc_stats");
      if (raw) setStatsLocal(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const speeds = JSON.parse(localStorage.getItem("wc_session_speeds") || "[]");
      setSessionSpeeds(Array.isArray(speeds) ? speeds.filter((x: any) => Number.isFinite(x) && x > 0) : []);
    } catch { setSessionSpeeds([]); }
    try {
      const peaks = JSON.parse(localStorage.getItem("wc_peak_multipliers") || "[]");
      setPeakMultipliers(Array.isArray(peaks) ? peaks.filter((x: any) => Number.isFinite(x) && x > 0) : []);
    } catch { setPeakMultipliers([]); }
    try {
      setLocalSessionsCount(Number(localStorage.getItem("wc_total_sessions") || "0") || 0);
    } catch { setLocalSessionsCount(0); }
  }, []);

  // Load server all-time (if signed in)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return; // not signed in or endpoint not ready
        const data = await res.json();
        if (!cancelled && data?.stats) setStatsServer(data.stats);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Category totals
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setLoadingTotals(true);
      const entries = await Promise.all(
        CATEGORY_SOURCES.map(async (c) => [c.key, await fetchJSONCount(c.path)] as const)
      );
      if (!isCancelled) {
        const next: Record<string, number | null> = {};
        for (const [k, v] of entries) next[k] = v;
        setTotals(next);
        setLoadingTotals(false);
      }
    })();
    return () => { isCancelled = true; };
  }, []);

  // Merge server + local so records don't show zero when server omits fields
const stats: Stats | null = useMemo(() => {
  const s = statsServer;
  const l = statsLocal;
  if (!s && !l) return null;

  const max = (a?: number, b?: number) => Math.max(Number(a ?? 0), Number(b ?? 0));

  // Base satisfies required numeric fields so TS is happy
  const base: Stats = {
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
    // optional fields – safe defaults
    bestScore: 0,
    longestChain: 0,
    highestMultiplier: 0,
    totalSessions: 0,
    uniqueWords: 0,
    badges: 0,
  };

  // Merge: local then server override the base
  const merged: Stats = { ...base, ...(l ?? {}), ...(s ?? {}) };

  // Normalize records to max(server, local)
  merged.highestWordScore     = max(s?.highestWordScore,     l?.highestWordScore);
  merged.longestAnimalStreak  = max(s?.longestAnimalStreak,  l?.longestAnimalStreak);
  merged.longestCountryStreak = max(s?.longestCountryStreak, l?.longestCountryStreak);
  merged.longestNameStreak    = max(s?.longestNameStreak,    l?.longestNameStreak);
  merged.longestChain         = max(s?.longestChain,         l?.longestChain);

  merged.totalWords           = max(s?.totalWords,           l?.totalWords);
  merged.animals              = max(s?.animals,              l?.animals);
  merged.countries            = max(s?.countries,            l?.countries);
  merged.names                = max(s?.names,                l?.names);
  merged.uniqueWords          = max(s?.uniqueWords,          l?.uniqueWords);
  merged.linksEarned          = max(s?.linksEarned,          l?.linksEarned);
  merged.linksSpent           = max(s?.linksSpent,           l?.linksSpent);

  return merged;
}, [statsServer, statsLocal]);


  // Fallback helpers
  const bestHighestMultiplier = useMemo(() => {
    const fromStats = stats?.highestMultiplier && stats.highestMultiplier > 0 ? stats.highestMultiplier : 0;
    const fromLocal = peakMultipliers.length ? Math.max(...peakMultipliers) : 0;
    return Math.max(fromStats || 0, fromLocal || 0);
  }, [stats, peakMultipliers]);

  // REPLACE the old sessionsPlayed useMemo with this:
  const sessionsPlayed = useMemo(() => {
    const s1 = Number(stats?.totalSessions ?? 0);
    const s2 = Number(localSessionsCount ?? 0);
    const s3 = Number(sessionSpeeds?.length ?? 0);
    const best = Math.max(s1, s2, s3);
    return best > 0 ? best : undefined;
  }, [stats, localSessionsCount, sessionSpeeds]);

  const wordSpeedAverageMs = useMemo(() => {
    if (!sessionSpeeds.length) return undefined;
    const sum = sessionSpeeds.reduce((a, b) => a + b, 0);
    return sum / sessionSpeeds.length;
  }, [sessionSpeeds]);

  const completion = useMemo(() => {
    if (!stats) return [] as Array<{ key: string; label: string; path: string; found: number; total: number | null; pct: number | null }>;
    const rows: Array<{ key: string; label: string; path: string; found: number; total: number | null; pct: number | null }> = [];
    for (const c of CATEGORY_SOURCES) {
      const total = totals[c.key] ?? null;
      // @ts-ignore
      const found = Number(stats[c.statsKey] ?? 0);
      const p = total && total > 0 ? (found / total) * 100 : null;
      rows.push({ key: c.key, label: c.label, path: c.path, found, total, pct: p });
    }
    return rows;
  }, [stats, totals]);

  const overallCompletion = useMemo(() => {
    const valid = completion.filter((r) => (r.total ?? 0) > 0);
    const totalAll = valid.reduce((acc, r) => acc + (r.total ?? 0), 0);
    const foundAll = valid.reduce((acc, r) => acc + (r.found ?? 0), 0);
    return { totalAll, foundAll, pct: pct(foundAll, totalAll), hasTotals: valid.length > 0 };
  }, [completion]);

  const kpis = useMemo(() => {
    if (!stats) return [] as { label: string; value: React.ReactNode; hint?: string }[];
    const totalWords = stats.totalWords ?? 0;
    const switches = stats.switches ?? 0;
    const sameLetterRate = totalWords ? `${(((stats.sameLetterWords ?? 0) / totalWords) * 100).toFixed(1)}%` : "0%";
    const powerupTypes = stats.powerups ? Object.keys(stats.powerups).length : 0;
    const linkEarned = stats.linksEarned ?? 0;
    const linkSpent = stats.linksSpent ?? 0;
    const linkEfficiency = linkEarned ? `${Math.max(0, (linkEarned - linkSpent)).toFixed(0)} saved` : "0 saved";
    const animalShare = totalWords ? `${(((stats.animals ?? 0) / totalWords) * 100).toFixed(1)}%` : "0%";
    const countryShare = totalWords ? `${(((stats.countries ?? 0) / totalWords) * 100).toFixed(1)}%` : "0%";
    const nameShare = totalWords ? `${(((stats.names ?? 0) / totalWords) * 100).toFixed(1)}%` : "0%";

    return [
      { label: "Total Valid Words (all time)", value: totalWords },
      { label: "Unique Words (approx)", value: stats.uniqueWords ?? Math.max(0, totalWords) },
      { label: "Same-letter Rate", value: sameLetterRate, hint: "Words where first & last letter match" },
      { label: "Switch Rate", value: totalWords ? `${((switches / totalWords) * 100).toFixed(1)}%` : "0%", hint: "Category changes per total words" },
      { label: "Power-up Diversity", value: powerupTypes, hint: "Distinct power-up types used" },
      { label: "Links: Earned → Spent", value: `${linkEarned} → ${linkSpent}`, hint: `Efficiency: ${linkEfficiency}` },
      { label: "Animal Share", value: animalShare },
      { label: "Country Share", value: countryShare },
      { label: "Name Share", value: nameShare },
      { label: "Sessions Played", value: sessionsPlayed ?? "—" },
      { label: "Best Score", value: stats.bestScore ?? "—" },
      { label: "Highest Multiplier", value: bestHighestMultiplier || "—" },
      { label: "Longest Chain (any)", value: stats.longestChain ?? "—" },
      { label: "Word Speed Average", value: fmtMsPerWord(wordSpeedAverageMs) },
    ];
  }, [stats, sessionsPlayed, bestHighestMultiplier, wordSpeedAverageMs]);

  const records = useMemo(() => {
    if (!stats) return [] as { label: string; value: React.ReactNode }[];
    return [
      { label: "Highest single-word score", value: stats.highestWordScore ?? 0 },
      { label: "Longest Animal streak", value: stats.longestAnimalStreak ?? 0 },
      { label: "Longest Country streak", value: stats.longestCountryStreak ?? 0 },
      { label: "Longest Name streak", value: stats.longestNameStreak ?? 0 },
      { label: "Longest Chain (any)", value: stats.longestChain ?? "—" },
      { label: "Highest Multiplier", value: bestHighestMultiplier || "—" },
    ];
  }, [stats, bestHighestMultiplier]);

  type ComputedBadge = {
    id: string;
    name: string;
    description: string;
    achievedTierIndex: number;
    tiers: Array<{ label: string; icon: string; current: number; target: number; achieved: boolean; hint?: string }>;
  };
  const computedBadges: ComputedBadge[] = useMemo(() => {
    if (!stats) return [];
    const mergedForBadges: Stats = {
      ...stats,
      highestMultiplier: bestHighestMultiplier || stats.highestMultiplier,
    };
    return BADGES.map((b) => {
      let achievedTierIndex = -1;
      const tiers = b.tiers.map((t) => {
        const res = t.requirement(mergedForBadges, totals);
        if (res.achieved) achievedTierIndex += 1;
        return { label: t.label, icon: t.icon, current: res.current, target: res.target, achieved: !!res.achieved, hint: res.hint };
      });
      return { id: b.id, name: b.name, description: b.description, achievedTierIndex, tiers };
    });
  }, [stats, totals, bestHighestMultiplier]);

  const unlockedBadgeCount = useMemo(
    () => computedBadges.reduce((acc, b) => acc + Math.max(0, b.achievedTierIndex + 1), 0),
    [computedBadges]
  );

  const handleGoLeaderboard = () => {
    const map: Record<string, string> = {
      highest_score: "points",
      longest_chain: "longest_chain",
      highest_multiplier: "highest_multiplier",
      most_animals: "animals",
      most_countries: "countries",
      most_names: "names",
      most_unique_words: "unique_words",
      most_badges: "badges",
    };
    const metricParam = map[metric] ?? "points";
    router.push(`/leaderboard?metric=${encodeURIComponent(metricParam)}`);
  };

  if (!stats) {
    return (
      <>
        {/* Content only — global Header/PageShell come from app/layout.tsx */}
        <div className="space-y-6">
          <Card>
            <div className="text-sm text-neutral-700">
              No stats yet. Play a game (and sign in) so your runs are saved to your account.
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Content only — global Header/PageShell come from app/layout.tsx */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your Word Chains Pokedex</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Totals, records, completion, and grindable badges.
              <span className="ml-2 text-xs italic text-neutral-400">
                {statsServer ? "Data source: server (all-time)" : "Data source: local (last session backup)"}
              </span>
            </p>
          </div>
          <div className="sm:w-80">
            <MetricSelector value={metric} onChange={setMetric} />
            <button
              onClick={handleGoLeaderboard}
              className="mt-2 w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              View Leaderboard for this Metric
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((k) => (
            <Card key={k.label}>
              <KPI label={k.label} value={<span>{k.value}</span>} hint={k.hint} />
            </Card>
          ))}
        </div>

        {/* Records */}
        <Card title="Records">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((r) => (
              <Row key={r.label} label={r.label} right={<span>{r.value}</span>} />
            ))}
          </div>
        </Card>

        {/* Category Completion */}
        <Card title="Category Completion">
          {loadingTotals && <div className="mb-2 text-sm text-neutral-500">Loading category totals…</div>}
          <div className="space-y-4">
            {completion.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-neutral-500">
                    {c.total != null && c.total > 0 ? (
                      <>
                        {c.found} / {c.total} ({c.pct != null ? formatPct(c.pct) : "—"})
                      </>
                    ) : (
                      <span className="italic">no data file (expected at {c.path})</span>
                    )}
                  </div>
                </div>
                {c.total != null && c.total > 0 ? <Progress pct={c.pct ?? 0} /> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-neutral-600">
            Overall completion across shown categories:{" "}
            {(() => {
              const v = completion.filter((r) => (r.total ?? 0) > 0);
              if (!v.length) return <span className="italic">connect category data files to see overall completion</span>;
              const totalAll = v.reduce((acc, r) => acc + (r.total ?? 0), 0);
              const foundAll = v.reduce((acc, r) => acc + (r.found ?? 0), 0);
              return (
                <>
                  <b>{foundAll}</b> / <b>{totalAll}</b> ({formatPct(pct(foundAll, totalAll))})
                </>
              );
            })()}
          </div>
        </Card>

        {/* Power-ups */}
        <Card title="Power-ups Used">
          {stats.powerups && Object.keys(stats.powerups).length > 0 ? (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stats.powerups).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2">
                  <span className="text-sm">{k}</span>
                  <span className="text-sm font-semibold">{String(v)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-neutral-500">No power-ups recorded yet.</div>
          )}
        </Card>

        {/* Badges */}
        <Card title={`Badges Unlocked (${unlockedBadgeCount})`}>
          <BadgeGrid badges={computedBadges} />
        </Card>

        {/* Share / Export */}
        <ShareExport stats={stats} />
      </div>
    </>
  );
}

function ShareExport({ stats }: { stats: Stats }) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(stats, null, 2), [stats]);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <Card title="Share / Export">
      <p className="mb-3 text-sm text-neutral-600">Copy your stats JSON (backup or send to support):</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button onClick={handleCopy} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200">
          {copied ? "Copied!" : "Copy JSON"}
        </button>
        <details className="w-full">
          <summary className="cursor-pointer text-sm text-neutral-500">Preview JSON</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
            {json}
          </pre>
        </details>
      </div>
    </Card>
  );
}

function BadgeGrid({
  badges,
}: {
  badges: Array<{
    id: string;
    name: string;
    description: string;
    achievedTierIndex: number;
    tiers: Array<{ label: string; icon: string; current: number; target: number; achieved: boolean; hint?: string }>;
  }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {badges.map((b) => (
        <div key={b.id} className="rounded-xl border border-neutral-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{b.name}</div>
              <div className="text-xs text-neutral-500">{b.description}</div>
            </div>
            <div className="text-2xl" title={b.achievedTierIndex >= 0 ? b.tiers[b.achievedTierIndex].label : "Locked"}>
              {b.achievedTierIndex >= 0 ? b.tiers[b.achievedTierIndex].icon : "🔒"}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {b.tiers.map((t) => {
              const pctNow = pct(t.current, t.target);
              const locked = !t.achieved;
              const showTarget = t.target && t.target > 0;
              return (
                <div key={t.label} className={`rounded-lg border border-neutral-200 p-3 ${locked ? "bg-neutral-50" : "bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <span className={`text-sm font-medium ${locked ? "text-neutral-500" : ""}`}>{t.label}</span>
                    </div>
                    <div className="text-xs text-neutral-500">{showTarget ? `${Math.min(100, Math.floor(pctNow))}%` : "—"}</div>
                  </div>
                  <div className="mt-2">{showTarget ? <Progress pct={pctNow} /> : <div className="text-xs text-neutral-400">No total available</div>}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {showTarget ? `${t.current} / ${t.target}` : `${t.current} / —`}
                    {t.hint ? ` · ${t.hint}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
