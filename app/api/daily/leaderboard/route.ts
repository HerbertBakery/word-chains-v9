// app/api/daily/leaderboard/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodaySpec } from "@/lib/dailySpec";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIntSafe(v: string | null, def: number, clampMin = 0, clampMax = Infinity) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(clampMin, Math.min(clampMax, n));
}

export async function GET(req: Request) {
  const log = (msg: string, extra?: any) => {
    console.error(`[daily/leaderboard] ${msg}`, extra ?? "");
  };

  try {
    // Session (only used for "your rank" and streak)
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session as any)?.user?.id as string | undefined;
    } catch (e) {
      log("session error (non-fatal)", (e as any)?.message || e);
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const limit = parseIntSafe(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntSafe(searchParams.get("offset"), 0, 0);

    // Today
    let todayKey = "";
    let todaySpecId = "";
    try {
      const spec = await getTodaySpec();
      todayKey = spec.dateKey;
      todaySpecId = spec.specId;
    } catch (e) {
      log("getTodaySpec failed", (e as any)?.message || e);
      return NextResponse.json({ ok: false, error: "Failed to load today key" }, { status: 500 });
    }

    const dateKey = dateParam && DATE_RE.test(dateParam) ? dateParam : todayKey;

    // Helpers
    const safeFindMany = async <T,>(fn: () => Promise<T>, tag: string): Promise<T | null> => {
      try { return await fn(); }
      catch (e: any) { log(`${tag} prisma error`, { message: e?.message, code: e?.code, meta: e?.meta }); return null; }
    };

    // ----- TOP FOR DAY (SIGNED-IN USERS ONLY) -----
    const dayRows =
      (await safeFindMany(
        () =>
          prisma.dailyRun.findMany({
            where: { dateKey, NOT: { userId: null } }, // exclude guests
            orderBy: [{ score: "desc" }, { createdAt: "asc" }],
            take: limit,
            skip: offset,
            select: {
              id: true,
              userId: true,
              score: true,
              createdAt: true,
              specId: true,
              dateKey: true,
              sameEnds: true,
              maxChain: true,
              completedAll: true,
            },
          }),
        "findMany(dayRows)"
      )) ?? [];

    // ----- ALL-TIME TOP (SIGNED-IN ONLY) -----
    const allTimeRows =
      (await safeFindMany(
        () =>
          prisma.dailyRun.findMany({
            where: { NOT: { userId: null } }, // exclude guests
            orderBy: [{ score: "desc" }, { createdAt: "asc" }],
            take: limit,
            select: {
              id: true,
              userId: true,
              score: true,
              createdAt: true,
              specId: true,
              dateKey: true,
              sameEnds: true,
              maxChain: true,
              completedAll: true,
            },
          }),
        "findMany(allTimeRows)"
      )) ?? [];

    const highestScoreToday = dayRows[0]?.score ?? 0;
    const highestScoreAllTime = allTimeRows[0]?.score ?? 0;

    // Hydrate users
    const userIds = Array.from(new Set([...dayRows, ...allTimeRows].map(r => r.userId).filter(Boolean))) as string[];
    const users =
      (await safeFindMany(
        () =>
          prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, image: true, username: true },
          }),
        "findMany(users)"
      )) ?? [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topForDay = dayRows.map((r) => ({ ...r, user: r.userId ? userMap.get(r.userId) ?? null : null }));
    const topAllTime = allTimeRows.map((r) => ({ ...r, user: r.userId ? userMap.get(r.userId) ?? null : null }));

    // Your rank for the requested day (if logged in)
    let yourRankToday: number | null = null;
    if (userId) {
      const you = await safeFindMany(
        () =>
          prisma.dailyRun.findFirst({
            where: { dateKey, userId },
            select: { score: true, createdAt: true },
          }),
        "findFirst(you)"
      );
      if (you) {
        const better = await safeFindMany(
          () =>
            prisma.dailyRun.count({
              where: {
                dateKey,
                NOT: { userId: null }, // only signed-in pool
                OR: [
                  { score: { gt: you.score } },
                  { score: you.score, createdAt: { lt: you.createdAt } },
                ],
              },
            }),
          "count(better)"
        );
        if (typeof better === "number") yourRankToday = better + 1;
      }
    }

    // Your streak (if logged in)
    let streak: { current: number; best: number } | null = null;
    if (userId) {
      const s = await safeFindMany(
        () =>
          prisma.dailyStreak.findUnique({
            where: { userId },
            select: { current: true, best: true },
          }),
        "findUnique(streak)"
      );
      if (s) streak = s;
    }

    return NextResponse.json({
      ok: true,
      dateKey,
      todayKey,
      todaySpecId,
      highestScoreToday,
      highestScoreAllTime,
      yourRankToday,
      streak,
      topForDay,
      topAllTime,
      limit,
      offset,
    });
  } catch (e: any) {
    console.error("[daily/leaderboard] fatal 500", { message: e?.message, stack: e?.stack });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
