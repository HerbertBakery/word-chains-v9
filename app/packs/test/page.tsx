"use client";

import { useMemo, useState } from "react";
import PackOpenFlow, { GrantedCard, PackId } from "@/app/components/PackOpenFlow";

export default function PacksTestPage() {
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState<PackId>("coin_small");

  // Sample pulls to preview visuals
  const debugCards: GrantedCard[] = useMemo(
    () => [
      { id: "dbg-1", word: "Lion",   category: "animal",  rarity: "RARE" },
      { id: "dbg-2", word: "Pizza",  category: "food",    rarity: "COMMON" },
      { id: "dbg-3", word: "Canada", category: "country", rarity: "LEGENDARY" },
    ],
    []
  );

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pack Animation Test</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm">Pack type:</label>
        <select
          value={pack}
          onChange={e => setPack(e.target.value as PackId)}
          className="rounded-lg border px-3 py-2 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700"
        >
          <option value="coin_small">coin_small (Gold)</option>
          <option value="coin_big">coin_big (Platinum/Blue)</option>
          <option value="piece_elite">piece_elite (Royal Purple)</option>
        </select>

        <button
          onClick={() => setOpen(true)}
          className="ml-auto rounded-xl px-4 py-2 bg-amber-500 text-black font-semibold shadow hover:bg-amber-400"
        >
          Show Test Pack
        </button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        This page uses <code>debugCards</code> so it won’t spend currency or hit the API.
      </p>

      {open && (
        <PackOpenFlow
          packId={pack}
          debugCards={debugCards}     // ← always uses these cards; no API call
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
