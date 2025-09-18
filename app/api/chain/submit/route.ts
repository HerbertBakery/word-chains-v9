// app/api/chain/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BodyShape = {
  score?: unknown;
  longestChain?: unknown;
  seasonKey?: unknown;
};

function asNonnegInt(x: unknown, fallback = 0): number {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Sign in required to submit Chain Mode scores." },
      { status: 401 }
    );
  }

  let body: BodyShape;
  try {
    body = (await req.json()) as BodyShape;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const score = asNonnegInt(body.score);
  const longestChain = asNonnegInt(body.longestChain);
  const seasonKey =
    typeof body.seasonKey === "string" && body.seasonKey.trim() ? body.seasonKey.trim() : "global";

  try {
    // 🔧 NOTE: use the NAMED unique selector from your schema
    const existing = await prisma.chainRun.findUnique({
      where: { uniq_chain_user_season: { userId, seasonKey } }, // <-- changed
      select: { id: true, score: true, longestChain: true },
    });

    if (!existing) {
      const row = await prisma.chainRun.create({
        data: { userId, seasonKey, score, longestChain },
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      });
      return NextResponse.json({ ok: true, created: true, improved: true, row });
    }

    const betterScore = Math.max(existing.score, score);
    const betterLongest = Math.max(existing.longestChain, longestChain);

    if (betterScore !== existing.score || betterLongest !== existing.longestChain) {
      const row = await prisma.chainRun.update({
        where: { id: existing.id },
        data: { score: betterScore, longestChain: betterLongest },
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      });
      return NextResponse.json({ ok: true, created: false, improved: true, row });
    }

    return NextResponse.json({
      ok: true,
      created: false,
      improved: false,
      row: { id: existing.id, score: existing.score, longestChain: existing.longestChain },
    });
  } catch (e) {
    console.error("[/api/chain/submit POST] error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Optional: quick health check
export async function GET() {
  return NextResponse.json({ ok: true, route: "chain/submit" });
}
