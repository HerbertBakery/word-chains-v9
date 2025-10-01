"use client";

import { useEffect, useState } from "react";

export type BankCard = {
  id: string;
  word: string;
  category: "animal" | "country" | "name" | "food" | "brand" | "screen";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};

export type DeckSlot = {
  slotIndex: number;
  card: BankCard | null;
};

const EMPTY_SLOTS: DeckSlot[] = [
  { slotIndex: 0, card: null },
  { slotIndex: 1, card: null },
  { slotIndex: 2, card: null },
];

function normalizeServerDeck(j: any): DeckSlot[] {
  if (Array.isArray(j?.slots) && j.slots.length) {
    return j.slots.map((s: any) => ({
      slotIndex: Number(s.slotIndex),
      card: s.card
        ? {
            id: String(s.card.id),
            word: String(s.card.word),
            category: s.card.category,
            rarity: s.card.rarity,
          }
        : null,
    }));
  }
  if (Array.isArray(j?.deck)) {
    return j.deck.map((d: any, i: number) => ({
      slotIndex: i,
      card: d
        ? {
            id: String(d.id),
            word: String(d.word),
            category: d.category,
            rarity: d.rarity,
          }
        : null,
    }));
  }
  return EMPTY_SLOTS.map(s => ({ ...s }));
}

export function useDeck() {
  const [slots, setSlots] = useState<DeckSlot[]>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // -------- Load deck --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/deck", { cache: "no-store", credentials: "include" });
        const j = r.ok ? await r.json() : null;
        if (!cancelled && j) setSlots(normalizeServerDeck(j));
        if (!r.ok && !cancelled) setSlots(EMPTY_SLOTS);
      } catch {
        if (!cancelled) setSlots(EMPTY_SLOTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lastSavedAt]);

  // Helper: extract [id|null, id|null, id|null]
  const extractDeckIds = (src: DeckSlot[]) =>
    [0,1,2].map(i => {
      const s = src.find(x => x.slotIndex === i);
      const id = s?.card?.id;
      if (id === "" || id === undefined) return null;
      return id ?? null;
    });

  // Helper: digest error text from server
  async function readErr(r: Response) {
    try {
      const j = await r.json();
      if (j?.error) return String(j.error);
      return `HTTP ${r.status}`;
    } catch {
      return `HTTP ${r.status}`;
    }
  }

  // -------- Save (multi-shape fallback) --------
  const save = async (maybeSlots?: DeckSlot[]) => {
    const src = Array.isArray(maybeSlots) ? maybeSlots : slots;
    const deckIds = extractDeckIds(src); // [id|null, id|null, id|null]
    const slotsShape = deckIds.map((id, i) => ({ slot: i, cardId: id }));

    // Attempt 1: JSON { deck: [...] }
    {
      const r = await fetch("/api/deck", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deck: deckIds }),
      });
      if (r.ok) {
        const j = await r.json();
        setSlots(normalizeServerDeck(j));
        setLastSavedAt(Date.now());
        return j;
      }
      // If 400, fall through
    }

    // Attempt 2: FormData with s0/s1/s2
    {
      const fd = new FormData();
      fd.set("s0", deckIds[0] ?? "");
      fd.set("s1", deckIds[1] ?? "");
      fd.set("s2", deckIds[2] ?? "");
      const r = await fetch("/api/deck", { method: "POST", credentials: "include", body: fd });
      if (r.ok) {
        const j = await r.json();
        setSlots(normalizeServerDeck(j));
        setLastSavedAt(Date.now());
        return j;
      }
    }

    // Attempt 3: URL-encoded with s0/s1/s2
    {
      const body = new URLSearchParams({
        s0: deckIds[0] ?? "",
        s1: deckIds[1] ?? "",
        s2: deckIds[2] ?? "",
      });
      const r = await fetch("/api/deck", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      if (r.ok) {
        const j = await r.json();
        setSlots(normalizeServerDeck(j));
        setLastSavedAt(Date.now());
        return j;
      }
    }

    // Attempt 4: JSON slots array { slots:[{slot,cardId}...] }
    {
      const r = await fetch("/api/deck", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slots: slotsShape }),
      });
      if (r.ok) {
        const j = await r.json();
        setSlots(normalizeServerDeck(j));
        setLastSavedAt(Date.now());
        return j;
      } else {
        const err = await readErr(r);
        throw new Error(`Saving deck failed — ${err}`);
      }
    }
  };

  return { slots, setSlots, save, loading };
}
