// app/api/streaks/ping-any/route.ts
import { NextResponse } from "next/server";
import { safeGetServerSession } from "@/lib/session";
import { pingPlayedAnyMode } from "@/lib/streaks";

export async function POST() {
  const session = await safeGetServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stats = await pingPlayedAnyMode(userId);
  return NextResponse.json({ ok: true, stats });
}
