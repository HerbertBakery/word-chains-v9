// app/api/daily/today/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTodaySpec } from "@/lib/dailySpec";

export async function GET() {
  try {
    const { dateKey, specId, spec } = await getTodaySpec();
    // Keep shape the Daily page expects: { ok, spec, startedAt }
    return NextResponse.json({
      ok: true,
      dateKey,
      specId,
      spec,                      // spec.id === dateKey
      startedAt: Date.now(),     // so client can compute elapsed time if desired
    });
  } catch (e: any) {
    console.error("[daily/today] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: "Failed to build today’s spec" }, { status: 500 });
  }
}
