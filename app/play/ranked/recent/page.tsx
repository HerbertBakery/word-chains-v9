// app/play/ranked/recent/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { deltaClass, fmtDelta } from "@/lib/rank";
import RankBadge from "@/app/components/rank/RankBadge";

type UserLite = { id: string; name: string | null; username: string | null; image: string | null };
type Match = {
  id: string;
  createdAt: string;
  seed: string;
  kind?: "DUEL" | "LADDER";
  playerOneId: string;
  playerTwoId: string | null;
  playerOneChainLength: number | null;
  playerOneScore: number | null;
  playerTwoChainLength: number | null;
  playerTwoScore: number | null;
  ratingDeltaOne?: number | null;
  ratingDeltaTwo?: number | null;
  winnerId: string | null;
  completedAt?: string | null;
  playerOne: UserLite;
  playerTwo: UserLite | null;
};

type Me = { rating: number; wins: number; losses: number; draws: number };

export default function RankedRecent() {
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? null;

  const [data, setData] = useState<Match[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/ranked/recent");
        if (!r.ok) setData([]);
        else {
          const j = await r.json();
          setData(Array.isArray(j) ? j : []);
        }
      } catch { setData([]); }

      try {
        const r2 = await fetch("/api/ladder/me");
        setMe(r2.ok ? await r2.json() : null);
      } catch { setMe(null); }

      setLoading(false);
    })();
  }, []);

  // 🔥 Win streak (your wins only)
  const streak = useMemo(() => {
    if (!viewerId || !data.length) return 0;
    let s = 0;
    for (const m of data) {
      const bothDone = m.playerOneChainLength !== null && m.playerTwoChainLength !== null;
      if (!m.winnerId || !bothDone) break;
      if (m.winnerId === viewerId) s += 1; else break;
    }
    return s;
  }, [data, viewerId]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      {/* Header + season ribbon */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs border-indigo-300/60 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10">
            <span>🏅 Season 1</span>
            <span className="opacity-70">Recent Ladder Games</span>
          </div>
          <h1 className="text-2xl font-bold mt-2">Recent Games</h1>
        </div>
        <div className="flex items-center gap-3">
          {me && <RankBadge rating={me.rating} />}
          {streak >= 3 && (
            <div className="rounded-full border px-3 py-1 text-xs border-amber-300/70 dark:border-amber-600/60 bg-amber-50/60 dark:bg-amber-900/20">
              🔥 Win Streak: <b className="tabular-nums">{streak}</b>
            </div>
          )}
        </div>
      </div>

      {/* Missions (strict: count *your* wins only) */}
      <Missions viewerId={viewerId} matches={data} />

      {loading && <div>Loading…</div>}
      {!loading && data.length === 0 && <div>No games yet.</div>}

      <div className="space-y-3">
        {data.map((m) => {
          const p1 = m.playerOne;
          const p2 = m.playerTwo;
          const bothDone = m.playerOneChainLength !== null && m.playerTwoChainLength !== null;
          const done = !!m.winnerId || bothDone;
          const p1Delta = m.ratingDeltaOne ?? 0;
          const p2Delta = m.ratingDeltaTwo ?? 0;

          return (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {p1?.image && <Image src={p1.image} alt="" width={28} height={28} className="rounded-full" />}
                  <div className="text-sm">
                    <div className="font-semibold">{p1?.name || p1?.username || "Player One"}</div>
                    <div className="opacity-60 text-xs">
                      Chain {m.playerOneChainLength ?? "—"} • Score {m.playerOneScore ?? "—"}
                    </div>
                    {done && p1Delta !== 0 && (
                      <div className={`text-xs ${deltaClass(p1Delta)}`}>{fmtDelta(p1Delta)}</div>
                    )}
                  </div>
                </div>

                <div className="text-xs opacity-70 hidden sm:block">Seed: {m.seed}</div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {p2?.name || p2?.username || (p2 ? "Player Two" : "Waiting…")}
                    </div>
                    <div className="opacity-60 text-xs">
                      Chain {m.playerTwoChainLength ?? "—"} • Score {m.playerTwoScore ?? "—"}
                    </div>
                    {done && p2Delta !== 0 && (
                      <div className={`text-xs ${deltaClass(p2Delta)}`}>{fmtDelta(p2Delta)}</div>
                    )}
                  </div>
                  {p2?.image && <Image src={p2.image} alt="" width={28} height={28} className="rounded-full" />}
                </div>
              </div>

              <div className="mt-3 text-sm">
                {m.winnerId
                  ? <span className="font-medium">Winner decided.</span>
                  : (bothDone ? <span className="opacity-70">Exact tie.</span> : <span className="opacity-70">Waiting for opponent…</span>)
                }
              </div>

              <div className="mt-3 text-xs opacity-60">
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/play/ranked/ladder" className="rounded-2xl bg-black text-white px-5 py-3 shadow hover:opacity-90">
          Play Ladder
        </Link>
        <Link href="/play/ranked" className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
          Ranked Hub
        </Link>
      </div>
    </div>
  );
}

/* ===== Missions card (strict win logic) ===== */
function Missions({ viewerId, matches }: { viewerId: string | null; matches: Match[] }) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfDay.getDay() + 6) % 7)); // Monday

  const isLadder = (m: Match) => (m.kind ?? "LADDER") === "LADDER";
  const isMyWin = (m: Match) => !!viewerId && !!m.winnerId && m.winnerId === viewerId;

  const ladderWinsSince = (from: Date) =>
    matches.filter((m) => isLadder(m) && isMyWin(m) && new Date(m.createdAt) >= from).length;

  const winsToday = ladderWinsSince(startOfDay);
  const winsThisWeek = ladderWinsSince(startOfWeek);

  return (
    <div className="rounded-2xl border p-5 bg-white/70 dark:bg-slate-900/60 dark:border-slate-700">
      <div className="mb-3 text-sm uppercase tracking-wide opacity-70">Missions</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MissionPill title="Win 2 Ladder games today" progress={Math.min(2, winsToday)} total={2} reward="+50 Coins" />
        <MissionPill title="Win 5 Ladder games this week" progress={Math.min(5, winsThisWeek)} total={5} reward="+150 Coins" />
      </div>
      {!viewerId && <div className="mt-2 text-xs opacity-70">Sign in to track mission progress.</div>}
    </div>
  );
}

function MissionPill({ title, progress, total, reward }: { title: string; progress: number; total: number; reward: string }) {
  const pct = Math.round((progress / total) * 100);
  return (
    <div className="rounded-xl border p-4 bg-white/60 dark:bg-slate-900/50 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
        <div className="text-xs rounded-full px-2 py-0.5 border bg-amber-50 dark:bg-amber-900/20 border-amber-300/60 dark:border-amber-600/50">
          🎯 {reward}
        </div>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs opacity-70">
        {progress} / {total} completed
      </div>
    </div>
  );
}
