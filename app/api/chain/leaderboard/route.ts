// app/api/chain/leaderboard/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// GET /api/chain/leaderboard?metric=score|chain&limit=50&offset=0&seasonKey=global
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") === "chain" ? "chain" : "score";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  const seasonKey = (searchParams.get("seasonKey") || "global").trim();

  try {
    const orderBy =
      metric === "chain"
        ? [{ longestChain: "desc" as const }, { score: "desc" as const }, { createdAt: "asc" as const }]
        : [{ score: "desc" as const }, { longestChain: "desc" as const }, { createdAt: "asc" as const }];

    const rows = await prisma.chainRun.findMany({
      where: {
        seasonKey,
        // Exclude guests
        userId: { not: null },
      },
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        playerName: true, // harmless to keep; won’t be used since userId != null
        score: true,
        longestChain: true,
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    return NextResponse.json(
      { metric, seasonKey, rows, limit, offset },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      // table not found (first deploy) — don’t 500 the page
      return NextResponse.json(
        { metric, seasonKey, rows: [], limit, offset, notSetup: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("[/api/chain/leaderboard GET] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
