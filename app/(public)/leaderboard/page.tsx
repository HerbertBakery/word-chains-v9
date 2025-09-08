"use client";
import GameTopBar from "../../components/GameTopBar";
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
    return () => { cancelled = true; };
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
      {/* 🔝 Always-visible toolbar */}
      <GameTopBar />

      {/* ⬇️ Your existing page content remains unchanged */}
      <div className="mx-auto max-w-5xl p-6 space-y-6">
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
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border bg-white/70 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left p-3 w-14">#</th>
                <th className="text-left p-3">Player</th>
                <th className="text-right p-3">{label}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} className="p-6 text-center text-neutral-500">Loading…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={3} className="p-6">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    {error}
                  </div>
                </td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-neutral-500">
                  No data yet. Finish a game (signed in) so it posts to <code className="px-1 py-0.5 rounded bg-neutral-100">/api/stats/ingest</code>.
                </td></tr>
              )}
              {!loading && !error && rows.map((r, idx) => (
                <tr
                  key={r.userId}
                  className="border-t hover:bg-neutral-50 cursor-pointer"
                  onClick={() => goTo(r)}
                >
                  <td className="p-3">{idx + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-neutral-200 overflow-hidden">
                        {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="font-medium">
                        {r.username || r.handle ? `@${r.handle ?? r.username}` : r.userId}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">{r.value}</td>
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

function UserModal({ userId, onClose }: { userId: string; onClose: ()=>void }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled=false;
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
    return () => {cancelled=true};
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{data?.username ?? userId}</div>
          <button onClick={onClose} className="text-sm text-neutral-500">Close</button>
        </div>
        {!data && !error && <div className="text-sm text-neutral-500">Loading…</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
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
            <div className="pt-2 border-t">
              <div className="font-medium mb-1">Badges</div>
              <div className="text-neutral-500">{data.badges ?? 0} unlocked</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({label, value}:{label:string; value:any}){
  return (
    <div className="rounded-xl border px-3 py-2 bg-neutral-50">
      <div className="text-neutral-500 text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
