import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Word Chains", description: "Chain words, stack multipliers, climb the leaderboard." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <header className="border-b bg-white"><div className="mx-auto max-w-6xl h-16 flex items-center justify-between px-4">
      <span className="font-semibold">Word Chains</span>
      <nav className="flex gap-3 text-sm"><a href="/">Home</a><a href="/word-chains">Play</a><a href="/leaderboard">Leaderboard</a><a href="/stats">Stats</a></nav>
    </div></header>
    <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
  </body></html>);
}
