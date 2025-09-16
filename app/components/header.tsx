// app/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";
import { useEffect, useState } from "react";

type Streaks = {
  dailyStreak: number;
  puzzleStreak: number;
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" }, // ← mode chooser (includes Daily Puzzle)
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
  { href: "/rules", label: "Rules" },
];

function useStreaks() {
  const [data, setData] = useState<Streaks | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/streaks/me", { cache: "no-store" });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch streaks", err);
      }
    })();
  }, []);
  return data;
}

function StreakBadge({
  label,
  value,
  emoji,
}: {
  label: string;
  value?: number;
  emoji: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
                 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700"
      title={`${label} Streak`}
    >
      <span>{emoji}</span>
      <span className="font-semibold">{value ?? 0}</span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const streaks = useStreaks();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur dark:bg-slate-900/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/wordchains-logo.png"
            alt="Word Chains"
            width={28}
            height={28}
            className="h-7 w-7 rounded"
          />
          <span className="font-semibold">Word Chains</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV.map((n) => {
            const isActive =
              pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`btn btn-ghost btn-sm ${
                  isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Streak badges */}
          <StreakBadge label="Daily" emoji="🔥" value={streaks?.dailyStreak} />
          <StreakBadge label="Puzzle" emoji="🧩" value={streaks?.puzzleStreak} />
          <AuthGate compact />
        </div>
      </div>
    </header>
  );
}
