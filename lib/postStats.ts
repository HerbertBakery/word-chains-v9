import { getClientUserId } from "./clientUserId";

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
  const userId = (opts?.userId ?? getClientUserId()).trim();
  try {
    await fetch("/api/stats/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...summary }),
      keepalive: true,
    });
  } catch {}
}
