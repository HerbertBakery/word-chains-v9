// app/api/daily/debug/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodaySpec } from "@/lib/dailySpec";

function parseIntSafe(v: string | null, def: number, min = 1, max = 100) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseIntSafe(searchParams.get("limit"), 10, 1, 100);

    const { dateKey: todayKey, specId: todaySpecId } = await getTodaySpec();

    const lastRuns = await prisma.dailyRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        deviceId: true,
        dateKey: true,
        specId: true,
        score: true,
        completedAll: true,
        sameEnds: true,
        maxChain: true,
        createdAt: true,
        user: { select: { id: true, username: true, name: true, image: true } },
      },
    });

    const todayRuns = await prisma.dailyRun.findMany({
      where: { dateKey: todayKey },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      take: 50,
      select: {
        id: true,
        userId: true,
        deviceId: true,
        score: true,
        completedAll: true,
        createdAt: true,
        user: { select: { id: true, username: true, name: true, image: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      now: new Date().toISOString(),
      todayKey,
      todaySpecId,
      counts: {
        lastRuns: lastRuns.length,
        todayRuns: todayRuns.length,
      },
      lastRuns,
      todayRuns,
    });
  } catch (e: any) {
    console.error("[daily/debug] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
