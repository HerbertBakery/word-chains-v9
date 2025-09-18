// app/daily/leaderboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type LBRow = {
  id: string;
  score: number;
  completedAll: boolean;
  userId: string | null;
  createdAt: string;
  user?: { name?: string | null; username?: string | null; image?: string | null };
};

export default function DailyLeaderboardPage() {
  const [dateKey, setDateKey] = useState<string>("");
  const [rows, setRows] = useState<LBRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/daily/leaderboard`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) {
          setDateKey(j.dateKey);
          setRows(j.runs || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Leaderboard</h1>
        <Link href="/daily" className="btn btn-ghost btn-sm">Back to Daily</Link>
      </div>

      <div className="card p-4">
        <div className="text-sm text-gray-600">Daily: <b>{dateKey || "—"}</b></div>

        {loading ? (
          <div className="mt-4">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-4 text-gray-600">No entries yet. Be the first!</div>
        ) : (
          <ol className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between rounded border p-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center font-semibold">{i + 1}</div>
                  <div className="text-sm">
                    <div className="font-medium">
                      {r.user?.username || r.user?.name || (r.userId ? "Player" : "Guest")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {r.completedAll ? " · Completed" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold tabular-nums">{r.score.toLocaleString()}</div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <style jsx global>{`
        .card { @apply rounded-2xl border bg-white/80 shadow-sm backdrop-blur; }
        .btn { @apply rounded-xl px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition; }
        .btn-ghost { @apply border-transparent bg-transparent; }
        .btn-ghost:hover { @apply bg-gray-100; }
      `}</style>
    </div>
  );
}
