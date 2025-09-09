"use client";

import React, { useEffect, useState } from "react";

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
  handle?: string | null; // <= used to route to /u/[handle]
  image?: string | null;
  value: number;
};

export default function LeaderboardPage() {
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
      {/* Content only — global Header/PageShell come from app/layout.tsx */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Global Leaderboard</h1>
            <p className="text-sm text-neutral-500">Click a player to view their profile & full stats.</p>
          </div>
          <label className="sm:w-80">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Metric</span>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
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

        <div className="overflow-hidden rounded-2xl border bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="w-14 p-3 text-left">#</th>
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-right">{label}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-neutral-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={3} className="p-6">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-neutral-500">
                    No data yet. Finish a game (signed in) so it posts to{" "}
                    <code className="rounded bg-neutral-100 px-1 py-0.5">/api/stats/ingest</code>.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((r, idx) => (
                  <tr
                    key={r.userId}
                    className="cursor-pointer border-t hover:bg-neutral-50"
                    onClick={() => goTo(r)}
                  >
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-200">
                          {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="font-medium">
                          {r.username || r.handle ? `@${r.handle ?? r.username}` : r.userId}
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

        {/* Fallback modal for players with no username yet */}
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
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">{data?.username ?? userId}</div>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Close
          </button>
        </div>
        {!data && !error && <div className="text-sm text-neutral-500">Loading…</div>}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
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
            <div className="border-t pt-2">
              <div className="mb-1 font-medium">Badges</div>
              <div className="text-neutral-500">{data.badges ?? 0} unlocked</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border bg-neutral-50 px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
