// app/api/daily/health/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Simple DB ping
    const ping = await prisma.$queryRaw`SELECT 1`;

    // Count rows in DailyRun to confirm table exists
    const count = await prisma.dailyRun.count().catch(() => -1);

    return NextResponse.json({
      ok: true,
      ping: !!ping,
      dailyRuns: count,
      now: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[daily/health] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
