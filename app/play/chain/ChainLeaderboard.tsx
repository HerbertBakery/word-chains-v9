// app/play/chain/ChainLeaderboard.tsx
"use client";

import React from "react";

type Row = {
  id: string;
  createdAt: string;
  playerName: string | null;
  score: number;
  longestChain: number;
  user?: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

export default function ChainLeaderboard() {
  const [metric, setMetric] = React.useState<"score" | "chain">("score");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/chain/leaderboard?metric=${metric}&limit=50`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [metric]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Chain Leaderboard</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Chain Mode: 15s per word, can’t reuse words. Sorted by your selection below.
          </p>
        </div>

        <label className="sm:w-80">
          <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sort by</span>
          <select
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
                       dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            value={metric}
            onChange={(e) => setMetric(e.target.value as "score" | "chain")}
          >
            <option value="score">Highest Score</option>
            <option value="chain">Longest Chain</option>
          </select>
        </label>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm
                   dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50 text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
              <th className="w-14 p-3 text-left">#</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-right">{metric === "score" ? "Score" : "Longest Chain"}</th>
              <th className="p-3 text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td colSpan={4} className="p-6">
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700
                               dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {err}
                  </div>
                </td>
              </tr>
            )}
            {!loading && !err && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                  No Chain runs yet. Finish a Chain Mode game to post your score.
                </td>
              </tr>
            )}
            {!loading &&
              !err &&
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-white/5"
                >
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        {r.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.user.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="font-medium truncate">
                        {r.user?.username ?? r.user?.name ?? r.playerName ?? "Player"}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {metric === "score" ? r.score.toLocaleString() : r.longestChain}
                  </td>
                  <td className="p-3 text-right text-neutral-500 dark:text-neutral-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
