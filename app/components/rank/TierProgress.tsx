// app/components/rank/TierProgress.tsx
"use client";
import { tierForRating } from "@/lib/rank";

export default function TierProgress({ rating }: { rating: number }) {
  const t = tierForRating(rating);
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm opacity-70">Progress to next tier</div>
        <div className="text-xs tabular-nums opacity-70">{t.progressPct}%</div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all bg-gradient-to-r from-${t.color}-400 to-${t.color}-600`}
          style={{ width: `${t.progressPct}%` }}
        />
      </div>
      <div className="mt-1 text-xs opacity-70">
        {t.nextMin ? `${t.nextMin - rating} Elo to ${t.name === "Grandmaster" ? "?" : "next tier"}` : "Top tier"}
      </div>
    </div>
  );
}
