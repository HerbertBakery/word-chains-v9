// app/play/ranked/result/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

type RankedUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
};

type RankedMatch = {
  id: string;
  seed: string;
  createdAt: string;
  playerOne?: RankedUser | null;
  playerTwo?: RankedUser | null;
  playerOneChainLength?: number | null;
  playerTwoChainLength?: number | null;
  playerOneScore?: number | null;
  playerTwoScore?: number | null;
  winnerId?: string | null;
  ratingDeltaOne?: number | null;
  ratingDeltaTwo?: number | null;
};

function fmtDelta(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}
function deltaClass(n: number) {
  return n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-500";
}

function ResultInner() {
  const sp = useSearchParams();
  const matchId = sp.get("match") || "";

  const [data, setData] = useState<RankedMatch | null>(null);
  const [loading, setLoading] = useState<boolean>(!!matchId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!matchId) {
        setError("Missing match id.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const r = await fetch(`/api/ranked/${matchId}`, { cache: "no-store" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load match (${r.status})`);
        }
        const j = (await r.json()) as RankedMatch;
        if (alive) setData(j);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load result");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [matchId]);

  const decided = useMemo(() => {
    if (!data) return false;
    if (data.winnerId !== null && data.winnerId !== undefined) return true;
    // fall back: both sides submitted identical stats (exact tie)
    const bothHave =
      data.playerOneChainLength !== null &&
      data.playerOneChainLength !== undefined &&
      data.playerTwoChainLength !== null &&
      data.playerTwoChainLength !== undefined;
    return bothHave;
  }, [data]);

  const p1 = data?.playerOne;
  const p2 = data?.playerTwo;

  const p1Name = p1?.name || p1?.username || "Player One";
  const p2Name = p2?.name || p2?.username || (p2 ? "Player Two" : "Waiting…");

  const p1Delta = data?.ratingDeltaOne ?? 0;
  const p2Delta = data?.ratingDeltaTwo ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900 dark:text-slate-200">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ladder Match Result</h1>
        <Link
          href="/play"
          className="text-sm underline opacity-80 hover:opacity-100 text-slate-700 dark:text-slate-300"
        >
          ← All Modes
        </Link>
      </div>

      <div className="card">
        {!matchId && (
          <div className="text-sm text-rose-600">No match id provided.</div>
        )}

        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-24 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-rose-600">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {/* Header: players */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {p1?.image && (
                  <Image
                    src={p1.image}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                )}
                <div className="text-sm">
                  <div className="font-semibold">{p1Name}</div>
                  <div className="opacity-60 text-xs">
                    Chain {data.playerOneChainLength ?? "—"} • Score {data.playerOneScore ?? "—"}
                  </div>
                  {decided && p1Delta !== 0 && (
                    <div className={`text-xs ${deltaClass(p1Delta)}`}>{fmtDelta(p1Delta)}</div>
                  )}
                </div>
              </div>

              <div className="text-xs opacity-70 hidden sm:block">
                Seed: {data.seed}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-sm">{p2Name}</div>
                  <div className="opacity-60 text-xs">
                    Chain {data.playerTwoChainLength ?? "—"} • Score {data.playerTwoScore ?? "—"}
                  </div>
                  {decided && p2Delta !== 0 && (
                    <div className={`text-xs ${deltaClass(p2Delta)}`}>{fmtDelta(p2Delta)}</div>
                  )}
                </div>
                {p2?.image && (
                  <Image
                    src={p2.image}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                )}
              </div>
            </div>

            {/* Verdict copy */}
            <div className="mt-4 text-sm">
              {decided ? (
                data.winnerId ? (
                  <span className="font-medium">
                    {data.winnerId === p1?.id
                      ? `${p1Name} wins!`
                      : data.winnerId === p2?.id
                        ? `${p2Name} wins!`
                        : "Winner decided."}
                  </span>
                ) : (
                  <span className="opacity-70">Exact tie.</span>
                )
              ) : (
                <span className="opacity-70">
                  Waiting for opponent’s result… You’ll see the outcome here once both runs are submitted.
                </span>
              )}
            </div>

            <div className="mt-3 text-xs opacity-60">
              {new Date(data.createdAt).toLocaleString()}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/play/ranked/ladder"
                className="rounded-2xl bg-black px-5 py-3 text-white shadow hover:opacity-90"
              >
                Play Ladder
              </Link>
              <Link
                href="/play/ranked/recent"
                className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                View Recent Matches
              </Link>
              <Link
                href={`/play/chain?seed=${encodeURIComponent(data.seed)}&match=${encodeURIComponent(data.id)}`}
                className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Replay This Seed
              </Link>
              <Link
                href="/play"
                className="rounded-2xl border px-5 py-3 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Back to Modes
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function RankedResultPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="card animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-24 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </main>
      }
    >
      <ResultInner />
    </Suspense>
  );
}
