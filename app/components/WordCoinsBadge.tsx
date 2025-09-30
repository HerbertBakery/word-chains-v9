// app/components/WordCoinsBadge.tsx
"use client";

import { useEffect, useState, useCallback } from "react";

export default function WordCoinsBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/wordcoins/balance", {
        cache: "no-store",
        credentials: "include",
      });
      const j = await r.json();
      setBalance(Number(j?.balance) || 0);
    } catch {
      setBalance(0);
    }
  }, []);

  useEffect(() => {
    load();
    const onDelta = () => load(); // re-pull after server grants/spends
    window.addEventListener("wc:wordcoins:delta", onDelta as EventListener);
    return () => window.removeEventListener("wc:wordcoins:delta", onDelta as EventListener);
  }, [load]);

  return (
    <span
      id="wordcoins-badge"
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium
                 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700"
      title="WordCoins"
      role="status"
      aria-live="polite"
    >
      <span>🪙</span>
      <span className="font-semibold tabular-nums">
        {balance === null ? "—" : balance}
      </span>
    </span>
  );
}
