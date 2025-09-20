// app/play/page.tsx
"use client";

import Link from "next/link";
import DailyPlayPinger from "../components/DailyPlayPinger"; // ← keep relative path

export default function PlayChooser() {
  return (
    <>
      <DailyPlayPinger />

      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4">Choose a Mode</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Free Play */}
          <Link
            href="/word-chains"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Free Play</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              The original endless mode with powerups, links, and big multipliers.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge">Classic</span>
              <span className="badge">Endless</span>
            </div>
          </Link>

          {/* Daily Puzzle */}
          <Link
            href="/daily"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Daily Puzzle</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Curated goals, toned-down score target, and 3 hidden words worth big bonuses.
              Complete it to grow your Puzzle Streak.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-emerald">Goals</span>
              <span className="badge badge-amber">Hidden Words</span>
              <span className="badge badge-blue">Streaks</span>
            </div>
          </Link>

          {/* Chain Mode */}
          <Link
            href="/play/chain"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Chain Mode</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              A fast-paced challenge: clear random categories within 15 seconds each. No lives, no penalties—just see how far you can chain!
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-purple">15s Timer</span>
              <span className="badge badge-pink">Categories</span>
              <span className="badge badge-indigo">Endurance</span>
            </div>
          </Link>

          {/* Ranked Mode */}
          <Link
            href="/play/ranked"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Ranked Mode</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Compete on a shared seed. Play Ladder for Elo or challenge a friend with a share link.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-rose">Elo</span>
              <span className="badge badge-indigo">Ladder</span>
              <span className="badge badge-emerald">Play a Friend</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
