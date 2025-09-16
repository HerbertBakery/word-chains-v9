"use client";

import { useEffect } from "react";

const STORAGE_KEY = "wc_ping_play_date_toronto";

function torontoISODate() {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const p = fmt.formatToParts(now);
    const y = p.find((x) => x.type === "year")?.value ?? "2000";
    const m = p.find((x) => x.type === "month")?.value ?? "01";
    const d = p.find((x) => x.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function DailyPlayPinger() {
  useEffect(() => {
    const today = torontoISODate();
    const last = localStorage.getItem(STORAGE_KEY);
    if (last === today) return;

    (async () => {
      try {
        const res = await fetch("/api/streaks/ping-play", { method: "POST" });
        if (res.ok) localStorage.setItem(STORAGE_KEY, today);
      } catch {
        // ignore; will retry next visit
      }
    })();
  }, []);

  return null;
}
