// app/components/DailyLeaderboard.tsx
"use client";

import React from "react";
import useSWR from "swr";

type Row = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  score: number;
  createdAt: string;
  specId: string;
  dateKey: string;
  sameEnds: number;
  maxChain: number;
  completedAll: boolean;
  user?: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DailyLeaderboard({
  date,           // optional YYYY-MM-DD to view a past day
  pageSize = 25,  // change page size if needed
}: {
  date?: string;
  pageSize?: number;
}) {
  const [offset, setOffset] = React.useState(0);
  const qs = new URLSearchParams({
    ...(date ? { date } : {}),
    limit: String(pageSize),
    offset: String(offset),
  }).toString();

  const { data, error, isLoading } = useSWR(`/api/daily/leaderboard?${qs}`, fetcher, {
    revalidateOnFocus: true,
  });

  const rows: Row[] = data?.topForDay ?? [];
  const today = data?.todayKey as string | undefined;

  const onPrev = () => setOffset((o) => Math.max(0, o - pageSize));
  const onNext = () => setOffset((o) => o + pageSize);

  return (
    <div className="rounded-2xl border bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm opacity-70">
          Daily: <b>{data?.dateKey ?? "…"}</b>
          {today && data?.dateKey !== today && <span className="ml-2 text-xs">(viewing past day)</span>}
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70">
          {typeof data?.yourRankToday === "number" && (
            <span>Your rank: <b>#{data.yourRankToday}</b></span>
          )}
          {data?.streak && (
            <span>🔥 {data.streak.current}{typeof data.streak.best === "number" ? ` (best ${data.streak.best})` : ""}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div>Loading daily leaderboard…</div>
      ) : error || data?.error ? (
        <div className="text-rose-600">Failed to load leaderboard.</div>
      ) : rows.length === 0 ? (
        <div className="text-sm">No entries yet. Be the first!</div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, idx) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-black/5 p-3 dark:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right font-semibold">{offset + idx + 1}.</span>
                {r.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    src={r.user.image}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-black/10 dark:bg-white/10" />
                )}
                <div className="leading-tight">
                  <div className="font-medium">
                    {r.user?.username ?? r.user?.name ?? (r.userId ? "Player" : "Guest")}
                  </div>
                  <div className="text-xs opacity-70">
                    {r.completedAll ? "Completed" : "Died"} • Max {r.maxChain} • Same-Ends {r.sameEnds}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{r.score.toLocaleString()}</div>
                <div className="text-xs opacity-70">
                  {new Date(r.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onPrev}
          disabled={offset === 0}
        >
          ← Prev
        </button>
        <div className="text-xs opacity-70">
          Showing {rows.length} · limit {data?.limit ?? pageSize} · offset {data?.offset ?? offset}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onNext}
          disabled={rows.length < pageSize}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
