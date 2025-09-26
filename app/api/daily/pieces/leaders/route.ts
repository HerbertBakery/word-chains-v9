export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseIntSafe(v: string | null, def: number, min = 0, max = Infinity) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  try {
    // optional: who’s asking (so we can also return their total)
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session as any)?.user?.id as string | undefined;
    } catch {
      /* non-fatal */
    }

    const { searchParams } = new URL(req.url);
    const limit = parseIntSafe(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntSafe(searchParams.get("offset"), 0, 0);

    // Group counts by user using a Prisma-supported orderBy (count of userId)
    const grouped = await prisma.dailyPiece.groupBy({
      by: ["userId"],
      _count: { userId: true }, // number of pieces for this user
      orderBy: [{ _count: { userId: "desc" } }, { userId: "asc" }], // stable secondary sort
      take: limit,
      skip: offset,
    });

    const userIds = grouped.map(g => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, image: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const leaders = grouped.map(g => ({
      userId: g.userId,
      pieces: g._count.userId, // count result above
      user: userMap.get(g.userId) ?? null,
    }));

    const yourTotal = userId ? await prisma.dailyPiece.count({ where: { userId } }) : null;

    return NextResponse.json(
      { ok: true, mode: "pieces", leaders, yourTotal, limit, offset },
      { headers: { "cache-control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    console.error("[daily/pieces/leaders] 500", { message: e?.message, stack: e?.stack });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
