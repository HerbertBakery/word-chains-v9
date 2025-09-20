// app/play/ranked/ladder/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import RankBadge from "@/app/components/rank/RankBadge";
import TierProgress from "@/app/components/rank/TierProgress";

type Me = { rating: number; wins: number; losses: number; draws: number };

export default function LadderPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Load my rating/record
    fetch("/api/ladder/me")
      .then((r) => r.json())
      .then((j) => setMe(j))
      .catch(() => setMe({ rating: 1200, wins: 0, losses: 0, draws: 0 }));
  }, []);

  const playNow = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ladder/next", { method: "POST" });
      if (res.status === 401) {
        const cb = encodeURIComponent(window.location.href);
        // Redirect to sign in then back here
        window.location.href = `/api/auth/signin?callbackUrl=${cb}`;
        return;
      }
      const j = await res.json();
      if (!res.ok || !j?.matchId || !j?.seed) {
        setErr(j?.error || "Could not start a ladder game.");
        setBusy(false);
        return;
      }
      router.replace(`/play/chain?seed=${j.seed}&match=${j.matchId}&mode=ladder`);
    } catch (e) {
      setErr("Network error. Please try again.");
      setBusy(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold mb-3">Ladder</h1>
        <p className="mb-4">Sign in to play ladder matches and earn Elo.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => signIn()}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ladder</h1>
        <div className="flex gap-3">
          <Link
            href="/play/ranked/recent"
            className="rounded border px-4 py-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800 text-sm"
          >
            Recent Games
          </Link>
          <Link
            href="/play/ranked"
            className="rounded border px-4 py-2 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800 text-sm"
          >
            Back to Ranked
          </Link>
        </div>
      </div>

      {/* Profile / Rank Card */}
      <div className="rounded-2xl border p-5 bg-white/70 dark:bg-slate-900/60 dark:border-slate-700">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            {me ? (
              <>
                <RankBadge rating={me.rating} />
                <div className="text-sm opacity-70">
                  Record:{" "}
                  <span className="tabular-nums">{me.wins}</span>-
                  <span className="tabular-nums">{me.losses}</span>-
                  <span className="tabular-nums">{me.draws}</span>
                </div>
              </>
            ) : (
              <div className="h-8 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            )}
          </div>

          <div className="max-w-sm w-full">
            {me ? (
              <TierProgress rating={me.rating} />
            ) : (
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-2 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            )}
          </div>

          <div className="shrink-0">
            <button
              disabled={busy}
              className={`rounded-2xl px-5 py-3 shadow ${
                busy ? "bg-gray-300 text-gray-600 dark:bg-slate-700 dark:text-slate-400" : "bg-green-600 text-white hover:opacity-90"
              }`}
              onClick={playNow}
            >
              {busy ? "Setting up…" : "Play"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm opacity-70">
          When you click <b>Play</b>, you’ll either create a new seed (you go first) or be assigned to beat someone else’s seed.
          Elo updates once both sides have played.
        </p>

        {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}
      </div>
    </div>
  );
}
