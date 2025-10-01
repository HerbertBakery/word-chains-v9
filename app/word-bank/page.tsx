// app/word-bank/page.tsx
"use client";

import { useBank } from "@/app/hooks/useBank";
import { useDeck } from "@/app/hooks/useDeck";
import { useMemo, useState } from "react";
import type { ChainKey } from "@/lib/game/shared";

/** Rarity → styles (unchanged) */
type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
const RARITY_STYLES: Record<
  Rarity,
  { tile: string; pill: string; border: string; text: string }
> = {
  COMMON: {
    tile:
      "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700",
    pill: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    border: "border-zinc-300 dark:border-zinc-600",
    text: "text-zinc-900 dark:text-zinc-100",
  },
  RARE: {
    tile:
      "bg-gradient-to-br from-sky-200 to-sky-400 dark:from-sky-900/50 dark:to-sky-700/60",
    pill: "bg-sky-900 text-white dark:bg-sky-100 dark:text-sky-900",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-slate-900 dark:text-slate-100",
  },
  EPIC: {
    tile:
      "bg-gradient-to-br from-violet-300 to-fuchsia-500 dark:from-violet-900/60 dark:to-fuchsia-800/60",
    pill: "bg-violet-900 text-white dark:bg-violet-100 dark:text-violet-900",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-white dark:text-violet-50",
  },
  LEGENDARY: {
    tile:
      "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 dark:from-amber-900/60 dark:via-amber-800/60 dark:to-amber-700/60",
    pill: "bg-amber-900 text-white dark:bg-amber-100 dark:text-amber-900",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-slate-900 dark:text-amber-50",
  },
};

export default function BankPage() {
  const { cards } = useBank();
  const { slots, setSlots, save } = useDeck();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<{
    rarity: Rarity | "ALL";
    category: string | "ALL";
  }>({
    rarity: "ALL",
    category: "ALL",
  });

  const filtered = useMemo(() => {
    return cards.filter(
      (c) =>
        (filter.rarity === "ALL" || c.rarity === filter.rarity) &&
        (filter.category === "ALL" || c.category === filter.category)
    );
  }, [cards, filter]);

  // NEW: words currently occupying any deck slot (for quick duplicate checks/UX)
  const wordsInDeck = useMemo(() => {
    const s = new Set<string>();
    for (const slot of slots) {
      const w = slot.card?.word?.toLowerCase();
      if (w) s.add(w);
    }
    return s;
  }, [slots]);

  // MINIMAL CHANGE: prevent putting same word into multiple slots
  const putInSlot = (slotIndex: number, cardId: string) => {
    const card = cards.find((c) => c.id === cardId) || null;
    if (!card) return;

    const wordLower = card.word.toLowerCase();
    // If the same word already exists in a different slot, block it
    const duplicateInAnotherSlot = slots.some(
      (s) =>
        s.slotIndex !== slotIndex &&
        s.card?.word?.toLowerCase() === wordLower
    );
    if (duplicateInAnotherSlot) {
      // gentle UX; you can swap alert for toast if you have one
      alert(`You can’t use “${card.word}” in more than one slot.`);
      return;
    }

    // ✅ Adapt BankCard (category: string) → DeckCard (category: ChainKey union)
    const deckCard = {
      word: card.word,
      category: card.category as ChainKey,
      rarity: card.rarity as Rarity,
    };

    setSlots((prev) => {
      const next = [...prev];
      const i = next.findIndex((s) => s.slotIndex === slotIndex);
      if (i >= 0) next[i] = { slotIndex, card: deckCard };
      return next;
    });
  };

  const clearSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev];
      const i = next.findIndex((s) => s.slotIndex === slotIndex);
      if (i >= 0) next[i] = { slotIndex, card: null };
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await save(slots);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">WordBank</h1>

      {/* Deck (slots) */}
      <div className="mb-6 rounded-2xl border p-4 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700">
        <div className="text-sm uppercase tracking-wide opacity-70 mb-2">
          Your Deck
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {slots.map((s) => {
            const r: Rarity | null = (s.card?.rarity as Rarity) || null;
            const style = r ? RARITY_STYLES[r] : null;

            return (
              <div
                key={s.slotIndex}
                className={`rounded-2xl border p-3 transition-colors ${
                  style
                    ? `${style.tile} ${style.border}`
                    : "bg-white/70 dark:bg-slate-900/60 dark:border-slate-700"
                }`}
              >
                <div className={`text-xs opacity-80 mb-1 ${style?.text ?? ""}`}>
                  Slot {s.slotIndex + 1}
                </div>

                {s.card ? (
                  <>
                    <div
                      className={`flex items-center justify-between ${
                        style?.text ?? ""
                      }`}
                    >
                      <div className="font-semibold">{s.card.word}</div>
                      <span
                        className={`text-[11px] rounded-full px-2 py-0.5 ${
                          style?.pill ?? "border px-2 py-0.5"
                        }`}
                      >
                        {s.card.rarity}
                      </span>
                    </div>
                    <div
                      className={`text-xs opacity-90 mt-1 ${style?.text ?? ""}`}
                    >
                      {s.card.category}
                    </div>
                    <button
                      onClick={() => clearSlot(s.slotIndex)}
                      className={`mt-2 text-xs underline hover:opacity-90 ${
                        style?.text ?? ""
                      }`}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <div className="opacity-60 text-sm">Empty</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Deck"}
          </button>

          {saved && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              ✓ Deck saved successfully!
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex gap-2 text-sm">
        <select
          value={filter.rarity}
          onChange={(e) =>
            setFilter((f) => ({ ...f, rarity: e.target.value as any }))
          }
          className="rounded border px-2 py-1 bg-white text-slate-900
                     dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700
                     focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        >
          {["ALL", "COMMON", "RARE", "EPIC", "LEGENDARY"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={filter.category}
          onChange={(e) =>
            setFilter((f) => ({ ...f, category: e.target.value as any }))
          }
          className="rounded border px-2 py-1 bg-white text-slate-900
                     dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700
                     focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        >
          {["ALL", "animal", "country", "name", "food", "brand", "screen"].map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            )
          )}
        </select>
      </div>

      {/* Bank grid */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((c) => {
          const r = c.rarity as Rarity;
          const style = RARITY_STYLES[r];

          // Nice-to-have: disable “Put in Slot” if this word is already in *another* slot
          const wordLower = c.word.toLowerCase();
          const dupInDeck = wordsInDeck.has(wordLower);

          return (
            <div
              key={c.id}
              className={`rounded-2xl border p-3 transition-colors ${style.tile} ${style.border}`}
            >
              <div className="flex items-center justify-between">
                <div className={`font-semibold ${style.text}`}>{c.word}</div>
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${style.pill}`}>
                  {c.rarity}
                </span>
              </div>
              <div className={`text-xs mt-1 opacity-90 ${style.text}`}>
                Category: {c.category}
              </div>

              <div className="mt-2">
                <label className={`text-xs mr-2 ${style.text}`}>Put in:</label>
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => putInSlot(i, c.id)}
                    disabled={
                      // disable if this exact word is already used by some slot (prevents duplicates)
                      dupInDeck &&
                      !slots.some(
                        (s) =>
                          s.slotIndex === i &&
                          s.card?.word?.toLowerCase() === wordLower
                      )
                    }
                    className={`mr-1 rounded border px-2 py-0.5 text-xs
                                ${style.border} ${style.text} bg-white/20 dark:bg-black/10
                                ${
                                  dupInDeck &&
                                  !slots.some(
                                    (s) =>
                                      s.slotIndex === i &&
                                      s.card?.word?.toLowerCase() === wordLower
                                  )
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:opacity-95"
                                }`}
                    title={
                      dupInDeck &&
                      !slots.some(
                        (s) =>
                          s.slotIndex === i &&
                          s.card?.word?.toLowerCase() === wordLower
                      )
                        ? "That word is already in another slot"
                        : `Put into Slot ${i + 1}`
                    }
                  >
                    Slot {i + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
