// app/components/rank/RankBadge.tsx
"use client";
import { tierForRating } from "@/lib/rank";

export default function RankBadge({ rating, className = "" }: { rating: number; className?: string }) {
  const t = tierForRating(rating);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm
                  border-${t.color}-300/60 dark:border-${t.color}-500/40 bg-${t.color}-50/50 dark:bg-${t.color}-500/10 ${className}`}
    >
      <span className="text-base">{t.emoji}</span>
      <span className="font-semibold">{t.name}{t.division ? ` ${t.division}` : ""}</span>
      <span className="opacity-70 tabular-nums">({rating})</span>
    </div>
  );
}
