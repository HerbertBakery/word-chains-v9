"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// -------------------- Types --------------------
export type PackId = "coin_small" | "coin_big" | "piece_elite";

export type GrantedCard = {
  id: string;
  word: string;
  category: "name" | "animal" | "country" | "food" | "brand" | "screen";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};

type Props = {
  packId: PackId;
  onClose?: () => void;
  onGranted?: (cards: GrantedCard[]) => void;
  debugCards?: GrantedCard[]; // optional test mode (no spend)
};

// -------------------- Theme helpers --------------------
type Theme = {
  // outer frame/border + pack body
  frame: string;
  bodyFrom: string;
  bodyVia: string;
  bodyTo: string;
  // moving sheen
  sheenFrom: string;
  // shred colors (top/bottom)
  shredTop: string;
  shredBottom: string;
  // branding text color
  brandText: string;
  subText: string;
};

const THEMES: Record<PackId, Theme> = {
  // Gold (coins - small)
  coin_small: {
    frame: "border-4 border-amber-400",
    bodyFrom: "from-amber-200",
    bodyVia: "via-amber-400",
    bodyTo: "to-amber-600",
    sheenFrom: "from-white/40",
    shredTop: "bg-amber-500",
    shredBottom: "bg-amber-600",
    brandText: "text-black",
    subText: "text-black/80",
  },
  // Platinum/Silver with blue accent (coins - big)
  coin_big: {
    frame: "border-4 border-sky-400",
    bodyFrom: "from-zinc-200",
    bodyVia: "via-zinc-400",
    bodyTo: "to-sky-400",
    sheenFrom: "from-white/50",
    shredTop: "bg-sky-300",
    shredBottom: "bg-sky-500",
    brandText: "text-zinc-900",
    subText: "text-zinc-800/80",
  },
  // Royal Purple (pieces - elite loot)
  piece_elite: {
    frame: "border-4 border-violet-400",
    bodyFrom: "from-violet-200",
    bodyVia: "via-violet-500",
    bodyTo: "to-fuchsia-600",
    sheenFrom: "from-white/45",
    shredTop: "bg-violet-500",
    shredBottom: "bg-fuchsia-600",
    brandText: "text-white",
    subText: "text-white/90",
  },
};

// -------------------- Card Visual --------------------
const rarityStyle: Record<GrantedCard["rarity"], { ring: string; glow: string; label: string }> = {
  COMMON: { ring: "ring-zinc-400", glow: "shadow-zinc-400/30", label: "bg-zinc-700 text-zinc-100" },
  RARE: { ring: "ring-sky-400", glow: "shadow-sky-400/30", label: "bg-sky-600 text-white" },
  EPIC: { ring: "ring-violet-400", glow: "shadow-violet-400/30", label: "bg-violet-600 text-white" },
  LEGENDARY: { ring: "ring-amber-400", glow: "shadow-amber-400/40", label: "bg-amber-500 text-black" },
};

const WordCard: React.FC<{ card: GrantedCard; delay?: number }> = ({ card, delay = 0 }) => {
  const style = rarityStyle[card.rarity];
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay }}
      className={`relative w-56 h-80 rounded-2xl p-3 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 ring-2 ${style.ring} shadow-xl ${style.glow}`}
    >
      <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-semibold ${style.label}`}>
        {card.rarity}
      </div>
      <div className="absolute top-3 left-3 text-[10px] tracking-wide uppercase bg-black/30 text-white px-2 py-0.5 rounded">
        {card.category}
      </div>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div
            className="text-2xl font-extrabold tracking-wide drop-shadow"
            style={{ textShadow: "0 1px 8px rgba(255,255,255,0.08)" }}
          >
            {card.word}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 rounded-b-2xl bg-gradient-to-t from-white/10 to-transparent" />
    </motion.div>
  );
};

// -------------------- Pack Visual --------------------
const PackVisual: React.FC<{ theme: Theme; onOpen: () => void; disabled?: boolean }> = ({ theme, onOpen, disabled }) => {
  return (
    <motion.button
      disabled={disabled}
      onClick={onOpen}
      className={`relative w-60 h-80 select-none rounded-3xl ${theme.frame} shadow-2xl overflow-hidden ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      {/* Solid themed foil background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bodyFrom} ${theme.bodyVia} ${theme.bodyTo}`} />

      {/* Shiny moving highlight */}
      <motion.div
        className={`absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r ${theme.sheenFrom} to-transparent`}
        animate={{ left: ["-35%", "120%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ mixBlendMode: "screen" }}
      />

      {/* Branding */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className={`text-2xl font-extrabold drop-shadow-lg ${theme.brandText}`}>WORD CHAINS</h2>
          <p className={`mt-2 text-sm font-semibold ${theme.subText}`}>Collectible Pack</p>
        </div>
      </div>

      {/* Bottom hint */}
      {!disabled && (
        <div className={`absolute bottom-3 left-0 right-0 text-center text-xs font-semibold ${theme.subText}`}>
          Click to rip open
        </div>
      )}
    </motion.button>
  );
};

// -------------------- Main Flow --------------------
export default function PackOpenFlow({ packId, onClose, onGranted, debugCards }: Props) {
  const [phase, setPhase] = useState<"idle" | "buying" | "ready" | "opening" | "revealed" | "error">("idle");
  const [granted, setGranted] = useState<GrantedCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const theme = THEMES[packId];

  // StrictMode guard to prevent double-purchase
  const didBuyRef = useRef(false);

  const buy = useCallback(async () => {
    setErr(null);
    setPhase("buying");
    try {
      if (debugCards) {
        setGranted(debugCards);
        onGranted?.(debugCards);
        setPhase("ready");
        return;
      }
      const r = await fetch("/api/packs/open", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const cards: GrantedCard[] = j.created ?? [];
      setGranted(cards);
      onGranted?.(cards);
      setPhase("ready");
    } catch (e: any) {
      setErr(e?.message || "Failed to open pack");
      setPhase("error");
    }
  }, [packId, onGranted, debugCards]);

  useEffect(() => {
    if (didBuyRef.current) return; // guard for React 18 dev double-invoke
    didBuyRef.current = true;
    void buy();
  }, [buy]);

  const openPack = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("opening");
    setTimeout(() => setPhase("revealed"), 800);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="relative w-full max-w-5xl rounded-3xl bg-zinc-950/70 ring-1 ring-white/10 backdrop-blur-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Pack Opening</h3>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm text-zinc-300 hover:bg-white/10">
            Close
          </button>
        </div>

        {/* Body */}
        <div className="mt-6 grid place-items-center">
          {phase === "error" && <div className="text-red-400 text-sm">{err}</div>}

          {phase === "buying" && (
            <div className="flex flex-col items-center gap-4 text-zinc-300">
              <div className="animate-spin h-8 w-8 border-2 border-zinc-600 border-t-transparent rounded-full" />
              <div>Purchasing pack…</div>
            </div>
          )}

          <AnimatePresence>
            {phase === "ready" && (
              <motion.div
                key="pack"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
              >
                <PackVisual theme={theme} onOpen={openPack} />
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "opening" && (
            <div className="relative w-60 h-80">
              {/* faint pack underlay */}
              <motion.div className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }}>
                <PackVisual theme={theme} onOpen={() => {}} disabled />
              </motion.div>
              {/* shred halves */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-1/2"
                initial={{ opacity: 0, rotate: 0, x: 0, y: 0 }}
                animate={{ opacity: 1, rotate: -18, x: -80, y: -100 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className={`w-full h-full rounded-t-3xl ${theme.shredTop}`} />
              </motion.div>
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                initial={{ opacity: 0, rotate: 0, x: 0, y: 0 }}
                animate={{ opacity: 1, rotate: 18, x: 80, y: 100 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className={`w-full h-full rounded-b-3xl ${theme.shredBottom}`} />
              </motion.div>
            </div>
          )}

          {phase === "revealed" && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {granted?.slice(0, 3).map((g, i) => (
                <WordCard key={g.id} card={g} delay={i * 0.12} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-end gap-2">
          {phase === "revealed" && (
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
