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
        <Link href="/daily" className="btn btn-ghost btn-sm">
          Back to Daily
        </Link>
      </div>

      <div className="card p-4">
        <div className="text-sm text-gray-600 dark:text-neutral-300">
          Daily: <b>{dateKey || "—"}</b>
        </div>

        {loading ? (
          <div className="mt-4 text-gray-600 dark:text-neutral-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-4 text-gray-600 dark:text-neutral-400">No entries yet. Be the first!</div>
        ) : (
          <ol className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white/70 p-2
                           dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center font-semibold">{i + 1}</div>
                  <div className="text-sm">
                    <div className="font-medium">
                      {r.user?.username || r.user?.name || (r.userId ? "Player" : "Guest")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400">
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

      {/* Keep your local styles, but add dark variants so nothing washes out in Dark Mode */}
      <style jsx global>{`
        .card {
          /* original */
          border-radius: 1rem;
          border-width: 1px;
          background-color: rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(4px);
          /* dark additions */
          border-color: rgb(38 38 38 / 1); /* neutral-800 */
          background-color: rgb(23 23 23 / 0.6); /* neutral-900/60 */
        }

        .btn {
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-width: 1px;
          border-color: rgb(209 213 219 / 1); /* gray-300 */
          background-color: #fff;
          transition: background-color 150ms ease;
        }
        .btn:hover {
          background-color: rgb(249 250 251 / 1); /* gray-50 */
        }

        .btn-ghost {
          border-color: transparent;
          background-color: transparent;
        }
        .btn-ghost:hover {
          background-color: rgb(243 244 246 / 1); /* gray-100 */
        }

        /* --- Dark mode overrides (scoped to html.dark) --- */
        html.dark .btn {
          border-color: rgb(38 38 38 / 1); /* neutral-800 */
          background-color: rgb(23 23 23 / 1); /* neutral-900 */
          color: rgb(245 245 245 / 1); /* neutral-100 */
        }
        html.dark .btn:hover {
          background-color: rgb(38 38 38 / 1); /* neutral-800 */
        }

        html.dark .btn-ghost {
          background-color: transparent;
          border-color: transparent;
          color: rgb(229 229 229 / 1); /* neutral-200 */
        }
        html.dark .btn-ghost:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
