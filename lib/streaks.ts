// lib/streaks.ts
import { prisma } from "./prisma";

/** Toronto-local ISO date (YYYY-MM-DD) */
function torontoISODate(d = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value ?? "2000";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function isSameTorontoDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return torontoISODate(a) === torontoISODate(b);
}

async function ensurePlayerStats(userId: string) {
  const found = await prisma.playerStats.findUnique({ where: { userId } });
  if (found) return found;
  return prisma.playerStats.create({ data: { userId } });
}

/** Daily Streak: play any mode once per Toronto day */
export async function pingPlayedAnyMode(userId: string) {
  const today = new Date();
  const stats = await ensurePlayerStats(userId);

  if (isSameTorontoDay(stats.lastPlayedAt, today)) return stats;

  let nextDaily = 1;
  if (stats.lastPlayedAt) {
    const yesterdayKey = torontoISODate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastKey = torontoISODate(stats.lastPlayedAt);
    nextDaily = lastKey === yesterdayKey ? (stats.dailyStreak ?? 0) + 1 : 1;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.streakEvent.create({ data: { userId, kind: "PLAYED_ANY_MODE" } });
    return tx.playerStats.update({
      where: { userId },
      data: { dailyStreak: nextDaily, lastPlayedAt: today },
    });
  });

  return updated;
}

/** Puzzle Streak: complete the Daily Puzzle this Toronto day */
export async function pingCompletedDailyPuzzle(userId: string) {
  const today = new Date();
  const stats = await ensurePlayerStats(userId);

  if (isSameTorontoDay(stats.lastCompletedAt, today)) return stats;

  let nextPuzzle = 1;
  if (stats.lastCompletedAt) {
    const yesterdayKey = torontoISODate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastKey = torontoISODate(stats.lastCompletedAt);
    nextPuzzle = lastKey === yesterdayKey ? (stats.puzzleStreak ?? 0) + 1 : 1;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.streakEvent.create({ data: { userId, kind: "COMPLETED_DAILY_PUZZLE" } });
    return tx.playerStats.update({
      where: { userId },
      data: { puzzleStreak: nextPuzzle, lastCompletedAt: today },
    });
  });

  return updated;
}

export async function getMyStreaks(userId: string) {
  const stats = await ensurePlayerStats(userId);
  return {
    dailyStreak: stats.dailyStreak ?? 0,
    puzzleStreak: stats.puzzleStreak ?? 0,
    lastPlayedAt: stats.lastPlayedAt,
    lastCompletedAt: stats.lastCompletedAt,
  };
}
