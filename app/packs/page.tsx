// app/packs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PackOpenFlow from "@/app/components/PackOpenFlow";

type PackId = "coin_small" | "piece_elite";

const UI_PACKS: Record<
  PackId,
  { id: PackId; label: string; currency: "COIN" | "PIECE"; cost: number; count: number; note?: string }
> = {
  // Renamed: Coin Pack (Small) → WordPack; cost remains 100
  coin_small: { id: "coin_small", label: "WordPack", currency: "COIN", cost: 100, count: 3 },
  piece_elite: { id: "piece_elite", label: "Puzzle Piece Pack", currency: "PIECE", cost: 5, count: 5, note: "Better loot" },
};

/** Mini pack preview — themed to match the opening overlay */
function PackPreview({ packId }: { packId: PackId }) {
  const theme =
    packId === "coin_small"
      ? {
          frame: "border-4 border-amber-400",
          body: "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600",
          sheenFrom: "from-white/40",
          brandText: "text-black",
          subText: "text-black/80",
          title: "WORD CHAINS",
          subtitle: "WordPack",
        }
      : {
          frame: "border-4 border-violet-400",
          body: "bg-gradient-to-br from-violet-200 via-violet-500 to-fuchsia-600",
          sheenFrom: "from-white/45",
          brandText: "text-white",
          subText: "text-white/90",
          title: "WORD CHAINS",
          subtitle: "Puzzle Pack",
        };

  return (
    <div className={`relative w-28 h-36 rounded-2xl ${theme.frame} shadow-xl overflow-hidden`}>
      {/* Solid foil background */}
      <div className={`absolute inset-0 ${theme.body}`} />
      {/* Moving sheen */}
      <motion.div
        className={`absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r ${theme.sheenFrom} to-transparent`}
        animate={{ left: ["-35%", "120%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ mixBlendMode: "screen" }}
      />
      {/* Branding */}
      <div className="absolute inset-0 grid place-items-center px-2 text-center">
        <div>
          <div className={`text-[10px] font-extrabold leading-tight ${theme.brandText}`}>{theme.title}</div>
          <div className={`text-[9px] mt-0.5 font-semibold ${theme.subText}`}>{theme.subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export default function PacksPage() {
  const [opening, setOpening] = useState<PackId | null>(null); // which pack is being bought/opened
  const [balance, setBalance] = useState<number | null>(null);
  const [pieces, setPieces] = useState<number | null>(null);

  const packs = useMemo(() => Object.values(UI_PACKS), []);

  // Initial balances
  useEffect(() => {
    fetch("/api/wordcoins/balance", { cache: "no-store", credentials: "include" })
      .then(r => r.json())
      .then(j => setBalance(j?.balance ?? 0))
      .catch(() => {});
    fetch("/api/daily/pieces/count", { cache: "no-store", credentials: "include" })
      .then(r => r.json())
      .then(j => setPieces(j?.count ?? 0))
      .catch(() => {});
  }, []);

  // After a pack opens, update balances
  const handleGranted = (cards: { id: string }[]) => {
    // refresh balances without reloading page
    fetch("/api/wordcoins/balance", { cache: "no-store", credentials: "include" })
      .then(r => r.json())
      .then(j => setBalance(j?.balance ?? balance))
      .catch(() => {});
    fetch("/api/daily/pieces/count", { cache: "no-store", credentials: "include" })
      .then(r => r.json())
      .then(j => setPieces(j?.count ?? pieces))
      .catch(() => {});

    // Let header badges refresh immediately
    window.dispatchEvent(new Event("wc:coins:refresh"));
    window.dispatchEvent(new Event("wc:packs:opened"));

    // Optional: invalidate /api/bank via your data lib if you have one
    console.log("Granted cards:", cards);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-2">Packs</h1>
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Balance: <b className="tabular-nums">{balance ?? "—"}</b> 🪙 &nbsp;•&nbsp; Pieces:{" "}
        <b className="tabular-nums">{pieces ?? "—"}</b> 🧩
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {packs.map(p => (
          <div
            key={p.id}
            className="rounded-2xl border p-4 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700"
          >
            <div className="flex items-start gap-4">
              {/* Themed mini pack preview */}
              <PackPreview packId={p.id} />

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-xs rounded-full border px-2 py-0.5">
                    {p.currency === "COIN" ? <>🪙 {p.cost}</> : <>🧩 {p.cost}</>}
                  </div>
                </div>

                <div className="text-sm opacity-80 mt-1">{p.count}× Word Cards</div>
                {p.note && <div className="text-xs opacity-60 mt-1">{p.note}</div>}

                <button
                  onClick={() => setOpening(p.id)}
                  disabled={opening !== null}             // prevent multiple buys while overlay is open
                  aria-busy={opening !== null}            // accessibility hint
                  className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold shadow bg-black text-white hover:opacity-90 disabled:opacity-60"
                >
                  {opening === p.id ? "Opening…" : "Buy & Open"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Animated pack-opening overlay */}
      {opening && (
        <PackOpenFlow
          packId={opening}
          onClose={() => setOpening(null)}
          onGranted={handleGranted}
        />
      )}
    </main>
  );
}
