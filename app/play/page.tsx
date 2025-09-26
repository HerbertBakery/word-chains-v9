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
          {/* Chain Mode (top-left) */}
          <Link
            href="/play/chain"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Chain Mode</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Beat the clock—15-second turns, no lives, six rechargeable powerups. How long can you keep the chain alive?
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-purple">15s Timer</span>
              <span className="badge badge-pink">Powerups</span>
              <span className="badge badge-indigo">Endurance</span>
            </div>
          </Link>

          {/* Ranked Mode (top-right) */}
          <Link
            href="/play/ranked"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Ranked Mode</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Test your skills in asynchronous head-to-head battles on a shared seed. Climb the ladder or challenge a friend.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-rose">Elo</span>
              <span className="badge badge-indigo">Ladder</span>
              <span className="badge badge-emerald">Play a Friend</span>
            </div>
          </Link>

          {/* Daily Puzzle (bottom-left) */}
          <Link
            href="/daily"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Daily Puzzle</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              A fresh challenge every day. Beat today’s puzzle as fast as you can and build your streak.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge badge-emerald">Daily</span>
              <span className="badge badge-amber">Speed</span>
              <span className="badge badge-blue">Streaks</span>
            </div>
          </Link>

          {/* Free Play (bottom-right) */}
          <Link
            href="/word-chains"
            className="card hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Free Play</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Sandbox mode: anything goes. Stack multipliers, complete missions, unleash powerups—how high can you score?
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="badge">Classic</span>
              <span className="badge">Endless</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
