// app/components/LoadingBar.tsx
"use client";

export function LoadingBar({
  pct,
  label = "Loading dictionary…",
}: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.floor(pct)));
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        <div className="text-sm tabular-nums">{clamped}%</div>
      </div>
      <div className="mt-3 h-2 w-full rounded bg-gray-200 overflow-hidden" aria-label={label}>
        <div
          className="h-2 bg-black/70 transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600">Fetching word lists…</div>
    </div>
  );
}
