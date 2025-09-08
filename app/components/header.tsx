// app/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/word-chains", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
  { href: "/rules", label: "Rules" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur dark:bg-slate-900/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/wordchains-logo.png" alt="Word Chains" width={28} height={28} className="h-7 w-7 rounded" />
          <span className="font-semibold">Word Chains</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`btn btn-ghost btn-sm ${pathname === n.href ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <AuthGate compact />
      </div>
    </header>
  );
}
