// lib/postStats.ts

export type GameSummary = {
  totalWords?: number;
  uniqueWords?: number;
  animals?: number;
  countries?: number;
  names?: number;
  sameLetterWords?: number;
  switches?: number;
  linksEarned?: number;
  linksSpent?: number;
  bestScore?: number;
  longestChain?: number;
  highestMultiplier?: number;
  longestAnimalStreak?: number;
  longestCountryStreak?: number;
  longestNameStreak?: number;
  badges?: number;
};

export async function postStats(summary: GameSummary, opts?: { userId?: string }) {
  // ensure we never send a decimal multiplier
  const highestMultiplier =
    summary.highestMultiplier != null
      ? Math.max(1, Math.round(Number(summary.highestMultiplier) || 0))
      : undefined;

  const payload = {
    ...summary,
    ...(highestMultiplier != null ? { highestMultiplier } : {}),
    // `userId` in body is ignored by your API (auth cookie is used) — leaving this out on purpose
  };

  try {
    await fetch("/api/stats/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore network errors so gameplay isn't blocked */
  }
}
