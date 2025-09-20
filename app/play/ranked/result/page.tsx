// app/play/ranked/result/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { tierForRating, deltaClass, fmtDelta } from "@/lib/rank";
import RankBadge from "@/app/components/rank/RankBadge";
import { useVFX, VfxProvider } from "@/app/hooks/useVFX";

type Match = {
  id: string;
  kind?: "DUEL" | "LADDER";
  seed: string;
  createdAt: string;
  playerOneId: string;
  playerTwoId: string | null;
  playerOneChainLength: number | null;
  playerOneScore: number | null;
  playerTwoChainLength: number | null;
  playerTwoScore: number | null;
  ratingDeltaOne?: number | null;
  ratingDeltaTwo?: number | null;
  winnerId: string | null;
  completedAt: string | null;
};

type Me = { rating: number; wins: number; losses: number; draws: number };

export default function RankedResultPage() {
  const { data: session } = useSession();
  const sp = useSearchParams();
  const vfx = useVFX();

  const matchId = sp.get("match");
  const [m, setM] = useState<Match | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const [mRes, meRes] = await Promise.all([
          fetch(`/api/ranked/${matchId}`),
          fetch(`/api/ladder/me`),
        ]);
        const mJ = await mRes.json();
        const meJ = meRes.ok ? await meRes.json() : null;
        setM(mJ);
        setMe(meJ);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  // Status flags
  const bothDone = !!(m && m.playerOneChainLength !== null && m.playerTwoChainLength !== null);
  const exactTie = !!(m && bothDone && !m.winnerId && (m.playerOneScore ?? 0) === (m.playerTwoScore ?? 0));
  const pending = !!(m && !m.winnerId && !exactTie && !bothDone);

  // My delta/promotions only when decided + ladder
  const { myDelta, myPrevRating, myCurrRating, promotedTo } = useMemo(() => {
    if (!m || !me || !session?.user?.id) return { myDelta: 0, myPrevRating: null as number | null, myCurrRating: null as number | null, promotedTo: null as string | null };
    if (pending || (m.kind ?? "LADDER") !== "LADDER") return { myDelta: 0, myPrevRating: null, myCurrRating: null, promotedTo: null };
    const amP1 = m.playerOneId === session.user.id;
    const delta = amP1 ? (m.ratingDeltaOne ?? 0) : (m.ratingDeltaTwo ?? 0);
    const curr = me.rating;
    const prev = curr - delta;
    const oldTier = tierForRating(prev).name;
    const newTier = tierForRating(curr).name;
    return {
      myDelta: delta,
      myPrevRating: prev,
      myCurrRating: curr,
      promotedTo: newTier !== oldTier && curr > prev ? `${newTier}${tierForRating(curr).division ? " " + tierForRating(curr).division : ""}` : null,
    };
  }, [m, me, session?.user?.id, pending]);

  // Confetti if I gained Elo or got promoted (only when decided)
  useEffect(() => {
    if (!m || (m.kind ?? "LADDER") !== "LADDER" || pending) return;
    if (myDelta > 0) {
      try { vfx.confettiBurst({ power: 0.9 }); } catch {}
    }
  }, [m, myDelta, pending, vfx]);

  if (!session?.user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Match Result</h1>
        <p className="mb-4">Sign in to view your ranked results.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => signIn()}>
          Sign in
        </button>
      </div>
    );
  }

  if (loading || !m) {
    return <div className="p-6">Loading result…</div>;
  }

  const iWon = m.winnerId === session.user.id;

  const kind = m.kind ?? "LADDER";
  const headline =
    pending
      ? "Result pending…"
      : kind === "DUEL"
        ? (iWon ? "You won the duel!" : exactTie ? "It’s a tie." : "You lost the duel.")
        : (iWon ? "You won the ladder match!" : exactTie ? "It’s a tie." : "You lost the ladder match.");

  const sub =
    pending
      ? "We’re waiting for the opponent to finish. Your result will update automatically."
      : (kind === "LADDER" ? "Elo updates are shown below. Longest chain wins; score breaks ties." : "Duel matches don’t affect Elo.");

  return (
    <VfxProvider>
      <div className="mx-auto max-w-3xl p-6 space-y-5">
        {/* Season ribbon */}
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs border-indigo-300/60 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10">
          <span>🏅 Season 1</span>
          <span className="opacity-70">WordChains Ladder</span>
        </div>

        <h1 className="text-3xl font-bold">{headline}</h1>
        <p className="opacity-70">{sub}</p>

        {/* Promotion / rating card (only when decided + ladder) */}
        {me && !pending && kind === "LADDER" && (
          <div className="rounded-2xl border p-5 bg-white/70 dark:bg-slate-900/60 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RankBadge rating={me.rating} />
              {myPrevRating !== null && (
                <div className="text-sm opacity-70">
                  {myPrevRating} → <span className="font-semibold">{myCurrRating}</span>
                </div>
              )}
            </div>
            {(myDelta !== 0) && (
              <div className={`text-sm font-semibold ${deltaClass(myDelta)}`}>
                {fmtDelta(myDelta)}
              </div>
            )}
          </div>
        )}

        {/* Breakdown card */}
        <div className="rounded-2xl border p-5 bg-white/70 dark:bg-slate-900/60 dark:border-slate-700">
          <div className="mb-2 text-sm uppercase tracking-wide opacity-70">Match</div>
          <div className="text-xs opacity-60 mb-3">Seed: <span className="font-mono">{m.seed}</span></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlayerCard
              title="Player One"
              winner={m.winnerId === m.playerOneId}
              chain={m.playerOneChainLength}
              score={m.playerOneScore}
              delta={kind === "LADDER" && !pending ? (m.ratingDeltaOne ?? 0) : null}
            />
            <PlayerCard
              title="Player Two"
              winner={m.winnerId === m.playerTwoId}
              chain={m.playerTwoChainLength}
              score={m.playerTwoScore}
              delta={kind === "LADDER" && !pending ? (m.ratingDeltaTwo ?? 0) : null}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/play/ranked/ladder"
              className="rounded-2xl bg-black text-white px-5 py-3 shadow hover:opacity-90"
            >
              Play Ladder
            </Link>
            <Link
              href="/play/ranked/recent"
              className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Recent Games
            </Link>
            <Link
              href="/play/ranked"
              className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Ranked Hub
            </Link>
          </div>
        </div>
      </div>
    </VfxProvider>
  );
}

function PlayerCard({
  title,
  winner,
  chain,
  score,
  delta,
}: {
  title: string;
  winner: boolean;
  chain: number | null;
  score: number | null;
  delta: number | null;
}) {
  return (
    <div className={`rounded-xl border p-4 ${winner ? "border-emerald-400/70 dark:border-emerald-600/70" : "border-slate-200 dark:border-slate-700"}`}>
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-xs opacity-70">Chain: <b>{chain ?? "—"}</b> • Score: <b>{score ?? "—"}</b></div>
      {delta !== null && delta !== 0 && (
        <div className={`mt-2 text-sm ${deltaClass(delta)}`}>{fmtDelta(delta)}</div>
      )}
    </div>
  );
}
