"use client";

import Link from "next/link";
import DailyPlayPinger from "../components/DailyPlayPinger"; // ← relative path

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
            className="rounded-2xl border p-5 hover:shadow-md transition bg-white"
          >
            <div className="text-lg font-semibold">Free Play</div>
            <p className="text-sm text-gray-600 mt-1">
              The original endless mode with powerups, links, and big multipliers.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-gray-100">Classic</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Endless</span>
            </div>
          </Link>

          {/* Daily Puzzle */}
          <Link
            href="/daily"
            className="rounded-2xl border p-5 hover:shadow-md transition bg-white"
          >
            <div className="text-lg font-semibold">Daily Puzzle</div>
            <p className="text-sm text-gray-600 mt-1">
              Curated goals, toned-down score target, and 3 hidden words worth big bonuses.
              Complete it to grow your Puzzle Streak.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-emerald-100">Goals</span>
              <span className="px-2 py-0.5 rounded bg-amber-100">Hidden Words</span>
              <span className="px-2 py-0.5 rounded bg-blue-100">Streaks</span>
            </div>
          </Link>

          {/* Chain Mode */}
          <Link
            href="/play/chain"
            className="rounded-2xl border p-5 hover:shadow-md transition bg-white"
          >
            <div className="text-lg font-semibold">Chain Mode</div>
            <p className="text-sm text-gray-600 mt-1">
              A fast-paced challenge: clear random categories within 15 seconds each. No lives, no penalties—just see how far you can chain!
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-purple-100">15s Timer</span>
              <span className="px-2 py-0.5 rounded bg-pink-100">Categories</span>
              <span className="px-2 py-0.5 rounded bg-indigo-100">Endurance</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
