"use client";
import { useEffect, useState } from "react";

export type BankCard = { id: string; word: string; category: string; rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" };

export function useBank() {
  const [cards, setCards] = useState<BankCard[]>([]);
  const refresh = async () => {
    const r = await fetch("/api/bank", { cache: "no-store", credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      setCards(Array.isArray(j.cards) ? j.cards : []);
    }
  };
  useEffect(() => { void refresh(); }, []);
  return { cards, refresh };
}
