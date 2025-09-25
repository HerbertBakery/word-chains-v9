// lib/streaks.ts
import { prisma } from "./prisma";
import { DAILY_TZ, toDailyKey, getTodayKey } from "./dailyKey";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function tzKey(d: Date = new Date()): string {
  return toDailyKey(d, DAILY_TZ);
}

function yesterdayTzKey(): string {
  return toDailyKey(new Date(Date.now() - ONE_DAY_MS), DAILY_TZ);
}

function isSameTzDay(a?: Date | null, b: Date = new Date()) {
  if (!a) return false;
  return tzKey(a) === tzKey(b);
}

async function ensurePlayerStats(userId: string) {
  const found = await prisma.playerStats.findUnique({ where: { userId } });
  if (found) return found;
  return prisma.playerStats.create({ data: { userId } });
}

/** Daily Streak: play ANY mode once per DAILY_TZ day */
export async function pingPlayedAnyMode(userId: string) {
  const stats = await ensurePlayerStats(userId);

  // Already counted today?
  if (isSameTzDay(stats.lastPlayedAt)) return stats;

  const todayKey = getTodayKey(); // DAILY_TZ
  const lastKey = stats.lastPlayedAt ? tzKey(stats.lastPlayedAt) : null;
  const nextDaily =
    lastKey === yesterdayTzKey() ? (stats.dailyStreak ?? 0) + 1 : 1;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.streakEvent.create({ data: { userId, kind: "PLAYED_ANY_MODE" } });
    return tx.playerStats.update({
      where: { userId },
      data: { dailyStreak: nextDaily, lastPlayedAt: new Date() },
    });
  });

  return updated;
}

/** Puzzle Streak: complete the Daily Puzzle this DAILY_TZ day */
export async function pingCompletedDailyPuzzle(userId: string) {
  const stats = await ensurePlayerStats(userId);

  if (isSameTzDay(stats.lastCompletedAt)) return stats;

  const lastKey = stats.lastCompletedAt ? tzKey(stats.lastCompletedAt) : null;
  const nextPuzzle =
    lastKey === yesterdayTzKey() ? (stats.puzzleStreak ?? 0) + 1 : 1;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.streakEvent.create({
      data: { userId, kind: "COMPLETED_DAILY_PUZZLE" },
    });
    return tx.playerStats.update({
      where: { userId },
      data: { puzzleStreak: nextPuzzle, lastCompletedAt: new Date() },
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
