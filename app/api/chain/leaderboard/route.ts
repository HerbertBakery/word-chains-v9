// app/api/chain/leaderboard/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Ensure we can associate guest runs via a cookie */
function ensureDeviceCookie(req: NextRequest) {
  const cookie = req.cookies.get("deviceId")?.value;
  if (cookie) return { deviceId: cookie, headers: new Headers() };

  const deviceId = crypto.randomUUID();
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `deviceId=${deviceId}; Path=/; Max-Age=${60 * 60 * 24 * 365 * 2}; SameSite=Lax`
  );
  return { deviceId, headers };
}

// GET /api/chain/leaderboard?metric=score|chain&limit=50&offset=0
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = (searchParams.get("metric") === "chain") ? "chain" : "score";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

  try {
    const orderBy =
      metric === "chain"
        ? [{ longestChain: "desc" as const }, { score: "desc" as const }, { createdAt: "asc" as const }]
        : [{ score: "desc" as const }, { longestChain: "desc" as const }, { createdAt: "asc" as const }];

    const rows = await prisma.chainRun.findMany({
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        playerName: true,
        score: true,
        longestChain: true,
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    return NextResponse.json({ metric, rows, limit, offset }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      // table not found (first deploy) — don’t 500 the page
      return NextResponse.json({ metric, rows: [], limit, offset, notSetup: true }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("[/api/chain/leaderboard GET] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/chain/leaderboard
// Body: { score: number, longestChain: number, name?: string }
export async function POST(req: NextRequest) {
  const { deviceId, headers } = ensureDeviceCookie(req);

  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    userId = (session as any)?.user?.id as string | undefined;
  } catch {
    // no-op
  }

  try {
    const body = await req.json();
    const score = Math.max(0, Math.floor(Number(body?.score ?? 0)));
    const longestChain = Math.max(0, Math.floor(Number(body?.longestChain ?? 0)));
    const playerName = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : null;

    if (!Number.isFinite(score) || !Number.isFinite(longestChain)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    await prisma.chainRun.create({
      data: { userId, deviceId, playerName, score, longestChain },
    });

    return new NextResponse(JSON.stringify({ ok: true }), {
      headers,
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json({ ok: false, error: "Chain table not initialized" }, { status: 503 });
    }
    console.error("[/api/chain/leaderboard POST] error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
