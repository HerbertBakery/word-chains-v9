"use client";
import Link from "next/link";

export default function RankedChooser() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Ranked</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/play/ranked/friend" className="card hover:shadow-md transition">
          <div className="text-lg font-semibold">Play a Friend</div>
          <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
            Create a duel link. Same seed for both players—longest chain wins (score tiebreak).
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm">
            <span className="badge badge-emerald">Share Link</span>
            <span className="badge badge-purple">Asynchronous</span>
          </div>
        </Link>

        <Link href="/play/ranked/ladder" className="card hover:shadow-md transition">
          <div className="text-lg font-semibold">Ladder</div>
          <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
            Quick match vs a similarly skilled player. Elo rating updates after each match.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm">
            <span className="badge badge-rose">Elo</span>
            <span className="badge badge-indigo">Matchmaking</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

