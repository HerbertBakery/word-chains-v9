// app/leaderboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import ChainLeaderboard from "@/app/play/chain/ChainLeaderboard";

/* ===================== Shared types for Daily tab ===================== */
type DailyRow = {
  id: string;
  score: number;
  dateKey?: string;
  createdAt: string;
  user?: { id: string; name: string | null; username: string | null; image: string | null };
};

type DailyPayload = {
  ok: true;
  dateKey: string;
  todayKey: string;
  todaySpecId: string;
  highestScoreToday: number;
  highestScoreAllTime: number;
  yourRankToday: number | null;
  streak: { current: number; best: number } | null;
  topForDay: DailyRow[];
  topAllTime: DailyRow[];
};

/* ===================== Page with tabs ===================== */
export default function LeaderboardTabsPage() {
  const [tab, setTab] = useState<"main" | "daily" | "chain">("main");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>

        <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "main"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            onClick={() => setTab("main")}
          >
            Global
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "daily"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            onClick={() => setTab("daily")}
          >
            {/* Label only changed from Daily -> Puzzle */}
            Puzzle
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "chain"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            onClick={() => setTab("chain")}
          >
            Chain
          </button>
        </div>
      </div>

      {tab === "main" ? <MainLeaderboard /> : tab === "daily" ? <DailyLeaderboard /> : <ChainLeaderboard />}
    </div>
  );
}

/* ===================================================================== */
/* ========================= GLOBAL (Main) TAB ========================== */
/* ===================================================================== */

const METRICS = [
  { value: "points", label: "Highest Score" },
  { value: "longest_chain", label: "Longest Chain" },
  { value: "highest_multiplier", label: "Highest Multiplier" },
  { value: "animals", label: "Most Animals Found" },
  { value: "countries", label: "Most Countries Found" },
  { value: "names", label: "Most Names Found" },
  { value: "unique_words", label: "Most Unique Words" },
  { value: "badges", label: "Most Badges" },
];

type Leader = {
  userId: string;
  username?: string | null;
  handle?: string | null; // used to route to /u/[handle]
  image?: string | null;
  value: number;
};

function MainLeaderboard() {
  const [metric, setMetric] = useState<string>("points");
  const [rows, setRows] = useState<Leader[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/leaderboard?metric=${encodeURIComponent(metric)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data.leaders) ? data.leaders : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [metric]);

  const label = METRICS.find((m) => m.value === metric)?.label ?? "Value";

  const goTo = (leader: Leader) => {
    if (leader.handle) {
      window.location.href = `/u/${encodeURIComponent(leader.handle)}`;
    } else {
      setSelectedUser(leader.userId); // fallback modal for users without a username yet
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Global Leaderboard</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Click a player to view their profile & full stats.</p>
          </div>
          <label className="sm:w-80">
            <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Metric</span>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm
                        dark:border-neutral-800 dark:bg-neutral-900/60">
          <table className="table">
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th>Player</th>
                <th className="text-right">{label}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={3} className="p-6">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700
                                    dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                      {error}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                    No data yet. Finish a game (signed in) so it posts to{" "}
                    <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-white/10">/api/stats/ingest</code>.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((r, idx) => (
                  <tr
                    key={r.userId}
                    className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-white/5"
                    onClick={() => goTo(r)}
                  >
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="font-medium truncate">
                          {r.username ?? r.handle ?? r.userId}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {metric === "highest_multiplier"
                        ? `${Math.max(1, Math.round(Number(r.value) || 0))}×`
                        : r.value}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {selectedUser && <UserModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}
      </div>
    </>
  );
}

function UserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">{data?.username ?? userId}</div>
          <button onClick={onClose} className="text-sm text-neutral-500 dark:text-neutral-400">
            Close
          </button>
        </div>
        {!data && !error && <div className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</div>}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700
                          dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {data && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total Words" value={data.stats?.totalWords ?? 0} />
              <Stat label="Unique Words" value={data.stats?.uniqueWords ?? 0} />
              <Stat label="Animals" value={data.stats?.animals ?? 0} />
              <Stat label="Countries" value={data.stats?.countries ?? 0} />
              <Stat label="Names" value={data.stats?.names ?? 0} />
              <Stat label="Longest Chain" value={data.stats?.longestChain ?? 0} />
              <Stat label="Highest Multiplier" value={data.stats?.highestMultiplier ?? 0} />
              <Stat label="Best Score" value={data.stats?.bestScore ?? 0} />
            </div>
            <div className="border-t border-neutral-200 pt-2 dark:border-neutral-800">
              <div className="mb-1 font-medium">Badges</div>
              <div className="text-neutral-500 dark:text-neutral-400">{data.badges ?? 0} unlocked</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-white/5">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

/* ===================================================================== */
/* ============================= DAILY TAB ============================== */
/* ===================================================================== */

function DailyLeaderboard() {
  const [data, setData] = useState<DailyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(""); // blank = today
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = date ? `/api/daily/leaderboard?date=${date}` : "/api/daily/leaderboard";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (!cancelled) setData(j?.ok ? j : null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load daily leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (loading)
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-neutral-500 shadow-sm
                      dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
        Loading daily leaderboard…
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                      dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                      dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
        Could not load daily data.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Daily · {data.dateKey}</h2>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">
              Highest Today: <b>{data.highestScoreToday}</b> · Highest (All Daily): <b>{data.highestScoreAllTime}</b>
            </div>
            {data.streak && (
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Your Streak: <b>{data.streak.current}</b> · Best: <b>{data.streak.best}</b>
                {data.yourRankToday && <span className="ml-3">Your Rank Today: <b>#{data.yourRankToday}</b></span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">View date:</label>
            <input
              type="date"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={date}
              max={data.todayKey}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DailyBoard title="Top Today" rows={data.topForDay} />
        <DailyBoard title="All-Time Daily" rows={data.topAllTime} showDate />
      </div>
    </div>
  );
}

function DailyBoard({ title, rows, showDate = false }: { title: string; rows: DailyRow[]; showDate?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm
                    dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold dark:border-neutral-800 dark:bg-white/5">{title}</div>
      <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center justify-between p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-6 text-right tabular-nums">{i + 1}.</span>
              <div className="truncate">
                {r.user ? (r.user.username ?? r.user.name ?? "Anon") : "Guest"}
              </div>
              {showDate && r.dateKey && <span className="text-xs text-neutral-500 dark:text-neutral-400">· {r.dateKey}</span>}
            </div>
            <span className="font-semibold tabular-nums">{r.score}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="p-4 text-sm text-neutral-500 dark:text-neutral-400">No entries yet.</li>}
      </ol>
    </div>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MetricKey =
  | "points"
  | "longest_chain"
  | "highest_multiplier"
  | "animals"
  | "countries"
  | "names"
  | "unique_words"
  | "badges";

const FIELD_MAP: Record<MetricKey, keyof import("@prisma/client").PlayerStats> = {
  points:             "bestScore",
  longest_chain:      "longestChain",
  highest_multiplier: "highestMultiplier",
  animals:            "animals",
  countries:          "countries",
  names:              "names",
  unique_words:       "uniqueWords",
  badges:             "badges",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const metricParam = (searchParams.get("metric") ?? "points") as MetricKey;
  const field = FIELD_MAP[metricParam] ?? "bestScore";

  const rows = await prisma.playerStats.findMany({
    orderBy: { [field]: "desc" },
    take: 100,
    include: { user: true },
  });

  const leaders = rows.map((r) => ({
    userId:  r.userId,
    username: r.user?.username ?? r.user?.name ?? null,
    handle:   r.user?.username ?? null,
    image:    r.user?.image ?? null,
    value:    (r as any)[field] ?? 0,
  }));

  return NextResponse.json({ leaders });
}
