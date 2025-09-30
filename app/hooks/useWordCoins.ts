"use client";

import { useEffect, useState } from "react";

export function useWordCoins() {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    // initial balance: server → local fallback
    (async () => {
      try {
        const r = await fetch("/api/wordcoins/balance", { cache: "no-store", credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          if (typeof j?.balance === "number") {
            setBalance(j.balance);
            return;
          }
        }
      } catch {}
      try {
        const v = localStorage.getItem("wc_wordcoins_balance");
        setBalance(v ? Number(JSON.parse(v)) || 0 : 0);
      } catch { setBalance(0); }
    })();
  }, []);

  useEffect(() => {
    const onDelta = (e: Event) => {
      const ce = e as CustomEvent<{ delta?: number }>;
      const d = typeof ce?.detail?.delta === "number" ? ce.detail.delta : 0;
      if (!d) return;
      setBalance((b) => {
        const next = (b || 0) + d;
        try { localStorage.setItem("wc_wordcoins_balance", JSON.stringify(next)); } catch {}
        return next;
      });
      const el = document.getElementById("wordcoins-badge");
      if (el) {
        el.classList.add("wc-coins-pop");
        setTimeout(() => el.classList.remove("wc-coins-pop"), 800);
      }
    };
    window.addEventListener("wc:wordcoins:delta", onDelta as EventListener);
    return () => window.removeEventListener("wc:wordcoins:delta", onDelta as EventListener);
  }, []);

  const refresh = async () => {
    try {
      const r = await fetch("/api/wordcoins/balance", { cache: "no-store", credentials: "include" });
      if (!r.ok) return;
      const j = await r.json();
      if (typeof j?.balance === "number") setBalance(j.balance);
    } catch {}
  };

  return { balance, refresh };
}
