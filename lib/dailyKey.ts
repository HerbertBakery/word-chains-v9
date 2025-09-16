// lib/dailyKey.ts
/**
 * Creates a canonical daily date key in the target timezone.
 * Example: "2025-09-15" for America/Mexico_City.
 */

export const DAILY_TZ = "America/Mexico_City";

/** Format a Date into YYYY-MM-DD in the given IANA timezone. */
export function toDailyKey(d: Date = new Date(), tz: string = DAILY_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;

  if (!y || !m || !day) {
    // Very defensive fallback — shouldn't happen in modern environments.
    const iso = new Date(d).toISOString().slice(0, 10);
    return iso;
  }
  return `${y}-${m}-${day}`;
}

/** Convenience helper for “right now” in DAILY_TZ. */
export function getTodayKey(): string {
  return toDailyKey(new Date(), DAILY_TZ);
}
