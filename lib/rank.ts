// lib/rank.ts
export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster";

type TierDef = {
  name: TierName;
  min: number;      // inclusive lower bound
  max?: number;     // exclusive upper bound (undefined = top)
  color: string;    // tailwind color token root
  emoji: string;    // quick visual
  divisions?: number; // how many roman divisions inside the tier (e.g., III => 3)
};

// Simple, friendly breakpoints. Tweak anytime.
export const TIERS: TierDef[] = [
  { name: "Bronze",      min: 0,    max: 1200, color: "amber",  emoji: "🥉", divisions: 3 },
  { name: "Silver",      min: 1200, max: 1400, color: "slate",  emoji: "🥈", divisions: 3 },
  { name: "Gold",        min: 1400, max: 1600, color: "yellow", emoji: "🥇", divisions: 3 },
  { name: "Platinum",    min: 1600, max: 1800, color: "cyan",   emoji: "💠", divisions: 3 },
  { name: "Diamond",     min: 1800, max: 2000, color: "violet", emoji: "💎", divisions: 3 },
  { name: "Master",      min: 2000, max: 2200, color: "rose",   emoji: "👑", divisions: 1 },
  { name: "Grandmaster", min: 2200,               color: "red",    emoji: "🔥", divisions: 1 },
];

export function tierForRating(rating: number) {
  const t = [...TIERS].reverse().find(t => rating >= t.min) || TIERS[0];
  const nextMin = TIERS.find(x => x.min > t.min)?.min; // next tier lower bound
  const within = Math.max(0, rating - t.min);
  const span = Math.max(1, (nextMin ?? (t.min + 200)) - t.min);
  const pct = Math.max(0, Math.min(100, Math.round((within / span) * 100)));
  // Divisions inside each tier (III → I going upward)
  let division: "III" | "II" | "I" | "" = "";
  if (t.divisions && nextMin) {
    const step = span / t.divisions;
    const idx = Math.min(t.divisions - 1, Math.floor(within / step));
    const map = ["I", "II", "III"] as const;
    division = map.slice(0, t.divisions).reverse()[idx] || "III";
  }
  return {
    ...t,
    nextMin: nextMin ?? null,
    progressPct: pct,
    division,
  };
}

export function deltaClass(delta: number) {
  return delta > 0 ? "text-emerald-600 dark:text-emerald-400"
       : delta < 0 ? "text-rose-600 dark:text-rose-400"
       : "text-slate-500";
}

export function fmtDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta} Elo`;
}
