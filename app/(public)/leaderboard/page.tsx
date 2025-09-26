// app/(public)/leaderboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import ChainLeaderboard from "@/app/play/chain/ChainLeaderboard";

/* ===================== Shared types for Daily tab (SPEED) ===================== */
type DailyRow = {
  id: string;
  timeTakenSec: number;
  dateKey?: string;
  createdAt: string;
  user?: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

type DailyPayload = {
  ok: true;
  mode: "speed";
  dateKey: string;
  todayKey: string;
  todaySpecId: string;
  // NOTE: some backends may send `fastestToday`/`fastestAllTime`; we normalize below
  bestToday?: number | null;
  bestAllTime?: number | null;
  fastestToday?: number | null;
  fastestAllTime?: number | null;
  yourRankToday: number | null;
  streak: { current: number; best: number } | null;
  topForDay: DailyRow[];
  topAllTime: DailyRow[];
  limit: number;
  offset: number;
};

/* ===================== Shared types for Daily tab (PIECES) ===================== */
type PiecesLeader = {
  userId: string;
  pieces: number;
  user?: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

type PiecesPayload = {
  ok: true;
  mode: "pieces";
  leaders: PiecesLeader[];
  yourTotal?: number | null;
};

const fmtTime = (s?: number | null) => (typeof s === "number" && isFinite(s) ? `${s.toFixed(2)}s` : "—");

/* ===================== Page with tabs ===================== */
export default function LeaderboardTabsPage() {
  const [tab, setTab] = useState<"main" | "daily" | "chain" | "ladder">("main");

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
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "ladder"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            onClick={() => setTab("ladder")}
          >
            Ladder
          </button>
        </div>
      </div>

      {tab === "main" ? (
        <MainLeaderboard />
      ) : tab === "daily" ? (
        <DailyLeaderboard />
      ) : tab === "chain" ? (
        <ChainLeaderboard />
      ) : (
        <LadderLeaderboard />
      )}
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
  handle?: string | null;
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
      setSelectedUser(leader.userId);
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
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                    No data yet. Finish a game (signed in) so it posts to{" "}
                    <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-white/10">/api/stats/ingest</code>.
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
  const [view, setView] = useState<"speed" | "pieces">("speed");

  // SPEED state
  const [data, setData] = useState<DailyPayload | null>(null);
  const [date, setDate] = useState<string>("");
  const [loadingSpeed, setLoadingSpeed] = useState(true);
  const [errorSpeed, setErrorSpeed] = useState<string | null>(null);

  // PIECES state
  const [pieces, setPieces] = useState<PiecesPayload | null>(null);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [errorPieces, setErrorPieces] = useState<string | null>(null);

  // Fetch SPEED payload
  useEffect(() => {
    if (view !== "speed") return;
    let cancelled = false;
    setLoadingSpeed(true);
    setErrorSpeed(null);
    const url = date ? `/api/daily/leaderboard?date=${date}` : "/api/daily/leaderboard";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (cancelled) return;
        // Normalize possible server field names
        if (j?.ok) {
          const bestToday = j.bestToday ?? j.fastestToday ?? null;
          const bestAllTime = j.bestAllTime ?? j.fastestAllTime ?? null;
          setData({
            ...j,
            bestToday,
            bestAllTime,
            mode: "speed",
          });
        } else {
          setData(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErrorSpeed(e?.message || "Failed to load daily leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSpeed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, date]);

  // Fetch PIECES payload (leaders of all-time collected pieces)
  useEffect(() => {
    if (view !== "pieces") return;
    let cancelled = false;
    setLoadingPieces(true);
    setErrorPieces(null);
    // Endpoint expected to return: { ok:true, mode:"pieces", leaders:[{userId,pieces,user?}], yourTotal? }
    fetch("/api/daily/pieces/leaders")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (!cancelled) setPieces(j?.ok ? j : null);
      })
      .catch((e) => {
        if (!cancelled) setErrorPieces(e?.message || "Failed to load puzzle pieces leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPieces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  return (
    <div className="space-y-4">
      {/* Picker row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold">Daily Leaderboard</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Metric
            </label>
            <select
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={view}
              onChange={(e) => setView(e.target.value as "speed" | "pieces")}
            >
              <option value="speed">Speed (Fastest Time)</option>
              <option value="pieces">Puzzle Pieces Collected (All-Time)</option>
            </select>

            {/* For Speed we allow date selection; pieces does not need a date */}
            {view === "speed" && data && (
              <div className="ml-2 flex items-center gap-2">
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
            )}
          </div>
        </div>
      </div>

      {/* SPEED VIEW */}
      {view === "speed" && (
        <>
          {loadingSpeed ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-neutral-500 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
              Loading daily leaderboard…
            </div>
          ) : errorSpeed ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
              {errorSpeed}
            </div>
          ) : !data ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
              Could not load daily data.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Daily Speed · {data.dateKey}</h2>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">
                      Fastest Today: <b>{fmtTime(data.bestToday ?? data.fastestToday)}</b> · Fastest (All Daily):{" "}
                      <b>{fmtTime(data.bestAllTime ?? data.fastestAllTime)}</b>
                    </div>
                    {data.streak && (
                      <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        Your Streak: <b>{data.streak.current}</b> · Best: <b>{data.streak.best}</b>
                        {data.yourRankToday && <span className="ml-3">Your Rank Today: <b>#{data.yourRankToday}</b></span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DailyBoard title="Top Today (Fastest)" rows={data.topForDay} />
                <DailyBoard title="All-Time Daily (Fastest)" rows={data.topAllTime} showDate />
              </div>
            </>
          )}
        </>
      )}

      {/* PIECES VIEW */}
      {view === "pieces" && (
        <>
          {loadingPieces ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-neutral-500 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
              Loading puzzle pieces leaderboard…
            </div>
          ) : errorPieces ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
              {errorPieces}
            </div>
          ) : !pieces ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 text-sm text-rose-600 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-rose-400">
              Could not load puzzle pieces data.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm
                            dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold dark:border-neutral-800 dark:bg-white/5">
                All-Time Puzzle Pieces Collected
              </div>
              <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {pieces.leaders.map((r, i) => (
                  <li key={r.userId} className="flex items-center justify-between p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 text-right tabular-nums">{i + 1}.</span>
                      <div className="truncate">
                        {r.user ? (r.user.username ?? r.user.name ?? "Anon") : r.userId}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{r.pieces}</span>
                  </li>
                ))}
                {pieces.leaders.length === 0 && (
                  <li className="p-4 text-sm text-neutral-500 dark:text-neutral-400">No entries yet.</li>
                )}
              </ol>
            </div>
          )}
        </>
      )}
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
            <span className="font-semibold tabular-nums">{fmtTime(r.timeTakenSec)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="p-4 text-sm text-neutral-500 dark:text-neutral-400">No entries yet.</li>}
      </ol>
    </div>
  );
}

/* ===================================================================== */
/* ============================ LADDER TAB ============================== */
/* ===================================================================== */

type LadderRow = {
  userId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: string;
  user: { id: string; username: string | null; name: string | null; image: string | null };
};

function LadderLeaderboard() {
  const [rows, setRows] = useState<LadderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/api/ladder/standings");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setRows(Array.isArray(j?.standings) ? j.standings : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load ladder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm
                    dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold dark:border-neutral-800 dark:bg-white/5">
        Ladder · Elo Rankings
      </div>
      {loading && <div className="p-6 text-sm text-neutral-500 dark:text-neutral-400">Loading…</div>}
      {err && !loading && (
        <div className="p-6 text-sm text-rose-600 dark:text-rose-400">{err}</div>
      )}
      {!loading && !err && (
        <table className="table">
          <thead>
            <tr>
              <th className="w-14">#</th>
              <th>Player</th>
              <th className="text-right">Elo</th>
              <th className="text-right">W-L-D</th>
              <th className="text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      {r.user?.image ? <img src={r.user.image} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="truncate font-medium">{r.user?.username ?? r.user?.name ?? r.userId}</div>
                  </div>
                </td>
                <td className="p-3 text-right font-semibold tabular-nums">{r.rating}</td>
                <td className="p-3 text-right tabular-nums">
                  {r.wins}-{r.losses}-{r.draws}
                </td>
                <td className="p-3 text-right text-xs opacity-70">
                  {new Date(r.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-sm text-neutral-500 dark:text-neutral-400">
                  No ladder data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
