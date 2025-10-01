"use client";
import { useEffect, useState } from "react";

export function usePacks() {
  const [types, setTypes] = useState<any[]>([]);
  const refresh = async () => {
    const r = await fetch("/api/packs/types", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setTypes(Array.isArray(j.types) ? j.types : []);
    }
  };
  const open = async (slug: string) => {
    const r = await fetch("/api/packs/open", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packSlug: slug }),
    });
    return r.json();
  };
  useEffect(() => { void refresh(); }, []);
  return { types, refresh, open };
}
