// app/api/daily/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // expected to be today's specId/dateKey (e.g., "2025-09-15")
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined;

    let todayPlayed = false;
    let streak: { current: number; best: number } | null = null;

    if (userId) {
      // Has this user submitted a run for this spec?
      const run = await prisma.dailyRun.findFirst({
        where: { specId: id, userId },
        select: { id: true },
      });
      todayPlayed = !!run;

      // Streak info if present
      const s = await prisma.dailyStreak.findUnique({
        where: { userId },
        select: { current: true, best: true },
      });
      if (s) streak = { current: s.current, best: s.best };
    }

    return NextResponse.json({ ok: true, todayPlayed, streak });
  } catch (e: any) {
    console.error("[daily/status] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
