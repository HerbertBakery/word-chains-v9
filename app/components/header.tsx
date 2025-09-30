'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import WordCoinsBadge from "@/app/components/WordCoinsBadge";

/* ==================== Dark Mode Toggle ==================== */
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
      setDark(true);
    } else {
      root.classList.remove("dark");
      setDark(false);
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    if (dark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  return (
    <button onClick={toggle} className="btn btn-ghost btn-sm" title="Toggle Dark Mode">
      {dark ? "🌙" : "☀️"}
    </button>
  );
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/chaindex", label: "ChainDex" }, // ← renamed from Stats
  { href: "/rules", label: "Rules" },
];

/* ==================== Pieces badge (live) ==================== */
function usePiecesCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/daily/pieces/count", { cache: "no-store" });
        if (!res.ok) throw new Error("no pieces endpoint");
        const j = await res.json();
        const maybe =
          typeof j?.count === "number" ? j.count :
          typeof j?.total === "number" ? j.total :
          Array.isArray(j?.pieces) ? j.pieces.length :
          null;
        if (!cancelled && typeof maybe === "number") setCount(maybe);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDelta = (e: Event) => {
      const ce = e as CustomEvent<{ delta?: number }>;
      const d = typeof ce?.detail?.delta === "number" ? ce.detail.delta : 1;
      setCount((c) => (typeof c === "number" ? c + d : d));

      const el = document.getElementById("piece-tab");
      if (el) {
        el.classList.add("wc-piece-pop");
        setTimeout(() => el.classList.remove("wc-piece-pop"), 800);
      }
    };
    window.addEventListener("wc:pieces:delta", onDelta as EventListener);
    return () => window.removeEventListener("wc:pieces:delta", onDelta as EventListener);
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      fetch("/api/daily/pieces/count", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : { count: 0 }))
        .then(j => {
          const maybe =
            typeof j?.count === "number" ? j.count :
            typeof j?.total === "number" ? j.total :
            Array.isArray(j?.pieces) ? j.pieces.length : null;
          if (typeof maybe === "number") setCount(maybe);
        })
        .catch(() => {});
    };
    window.addEventListener("wc:pieces:refresh", onRefresh);
    return () => window.removeEventListener("wc:pieces:refresh", onRefresh);
  }, []);

  return count ?? 0;
}

function PiecesBadge() {
  const pieces = usePiecesCount();
  return (
    <span
      id="piece-tab"
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
                 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700"
      title="Daily Pieces"
      role="status"
      aria-live="polite"
    >
      <span>🧩</span>
      <span className="font-semibold tabular-nums">{pieces}</span>
      <style jsx global>{`
        #piece-tab.wc-piece-pop { animation: wc-piece-pop 800ms cubic-bezier(.2,.8,.2,1) 1; }
        @keyframes wc-piece-pop {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0); transform: scale(1); }
          30% { box-shadow: 0 0 0 8px rgba(16,185,129,.18); transform: scale(1.06); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

/* ==================== Header ==================== */
export default function Header() {
  const pathname = usePathname();
  const { status } = useSession();

  // After login, claim any guest win for today, then refresh pieces.
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/daily/claim", { method: "POST" })
        .finally(() => {
          window.dispatchEvent(new Event("wc:pieces:refresh"));
        });
    } else if (status === "unauthenticated") {
      window.dispatchEvent(new Event("wc:pieces:refresh"));
    }
  }, [status]);

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
            const isActive = pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`btn btn-ghost btn-sm ${isActive ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Live pieces counter (🧩) */}
          <PiecesBadge />
          {/* NEW: WordCoins (🪙) */}
          <WordCoinsBadge />
          <ThemeToggle />
          <AuthGate compact />
        </div>
      </div>
    </header>
  );
}
