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
    // Session (only used for "your rank"/streak, etc.)
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
    const metric = (searchParams.get("metric") || searchParams.get("mode") || "speed").toLowerCase();

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

    // ==== NEW: Pieces (all-time total DailyPiece rows per user) ====
    if (metric === "pieces" || metric === "puzzle" || metric === "puzzle_pieces") {
      const safe = async <T,>(fn: () => Promise<T>, tag: string): Promise<T | null> => {
        try { return await fn(); }
        catch (e: any) { log(`${tag} prisma error`, { message: e?.message, code: e?.code, meta: e?.meta }); return null; }
      };

      // group by userId, count pieces, order by count desc
      const grouped =
        (await safe(
          () =>
            prisma.dailyPiece.groupBy({
              by: ["userId"],
_count: { _all: true },
orderBy: { _count: { userId: "desc" } },
take: limit,
skip: offset,

            }),
          "groupBy(dailyPiece)"
        )) ?? [];

      const userIds = grouped.map((g) => g.userId);
      const users =
        (await safe(
          () =>
            prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true, username: true, image: true },
            }),
          "findMany(users for pieces)"
        )) ?? [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Optional personal totals (doesn't affect UI if unauthenticated)
      const yourTotal =
        userId
          ? await safe(() => prisma.dailyPiece.count({ where: { userId } }), "count(your pieces)")
          : null;

      return NextResponse.json({
        ok: true,
        mode: "pieces",
        leaders: grouped.map((g) => ({
          userId: g.userId,
          pieces: g._count._all,
          user: userMap.get(g.userId) ?? null,
        })),
        yourTotal: typeof yourTotal === "number" ? yourTotal : null,
        limit,
        offset,
      });
    }

    // ==== Existing SPEED leaderboard (default) ====
    const dateKey = dateParam && DATE_RE.test(dateParam) ? dateParam : todayKey;

    const safe = async <T,>(fn: () => Promise<T>, tag: string): Promise<T | null> => {
      try { return await fn(); }
      catch (e: any) { log(`${tag} prisma error`, { message: e?.message, code: e?.code, meta: e?.meta }); return null; }
    };

    // ----- TOP FOR DAY (SIGNED-IN USERS ONLY) — by fastest time -----
    const dayRows =
      (await safe(
        () =>
          prisma.dailyRun.findMany({
            where: {
              dateKey,
              completedAll: true,
              NOT: { userId: null },
              timeTakenSec: { not: null },
            },
            orderBy: [{ timeTakenSec: "asc" }, { createdAt: "asc" }],
            take: limit,
            skip: offset,
            select: {
              id: true,
              userId: true,
              timeTakenSec: true,
              createdAt: true,
              specId: true,
              dateKey: true,
              completedAll: true,
            },
          }),
        "findMany(dayRows)"
      )) ?? [];

    // ----- ALL-TIME FASTEST (SIGNED-IN ONLY) -----
    const allTimeRows =
      (await safe(
        () =>
          prisma.dailyRun.findMany({
            where: {
              completedAll: true,
              NOT: { userId: null },
              timeTakenSec: { not: null },
            },
            orderBy: [{ timeTakenSec: "asc" }, { createdAt: "asc" }],
            take: limit,
            select: {
              id: true,
              userId: true,
              timeTakenSec: true,
              createdAt: true,
              specId: true,
              dateKey: true,
              completedAll: true,
            },
          }),
        "findMany(allTimeRows)"
      )) ?? [];

    const fastestToday = dayRows[0]?.timeTakenSec ?? null;
    const fastestAllTime = allTimeRows[0]?.timeTakenSec ?? null;

    // Hydrate users
    const userIds = Array.from(new Set([...dayRows, ...allTimeRows].map(r => r.userId).filter(Boolean))) as string[];
    const users =
      (await safe(
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

    // Your rank for the requested day (if logged in) — by time
    let yourRankToday: number | null = null;
    if (userId) {
      const you = await safe(
        () =>
          prisma.dailyRun.findFirst({
            where: { dateKey, userId, completedAll: true, timeTakenSec: { not: null } },
            select: { timeTakenSec: true, createdAt: true },
          }),
        "findFirst(you)"
      );
      if (you && typeof you.timeTakenSec === "number") {
        const better = await safe(
          () =>
            prisma.dailyRun.count({
              where: {
                dateKey,
                completedAll: true,
                NOT: { userId: null },
                timeTakenSec: { not: null, lt: you.timeTakenSec as number },
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
      const s = await safe(
        () =>
          prisma.dailyStreak.findUnique({
            where: { userId },
            select: { current: true, best: true },
          }),
        "findUnique(streak)"
      );
      if (s) streak = s;
    }

    // Back-compat shape for existing Daily UI (speed mode)
    return NextResponse.json({
      ok: true,
      mode: "speed",
      dateKey,
      todayKey,
      todaySpecId,
      bestToday: fastestToday,
      bestAllTime: fastestAllTime,
      yourRankToday,
      streak,
      topForDay,
      topAllTime,
      // Kept for older UIs that read `runs` (not used by the tabs page)
      runs: topForDay.map((r) => ({
        id: r.id,
        score: typeof r.timeTakenSec === "number" ? Number(r.timeTakenSec) : 0,
        completedAll: true,
        userId: r.userId,
        createdAt: r.createdAt as unknown as string,
        user: r.user ? { name: r.user.name, username: r.user.username, image: r.user.image } : undefined,
        timeTakenSec: typeof r.timeTakenSec === "number" ? Number(r.timeTakenSec) : null,
      })),
      limit,
      offset,
    });
  } catch (e: any) {
    console.error("[daily/leaderboard] fatal 500", { message: e?.message, stack: e?.stack });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
