// app/api/ladder/standings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force Node runtime for Prisma; keep fresh responses
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    const rows = await prisma.rankedRating.findMany({
      orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
      },
    });

    const standings = rows.map((r) => ({
      userId: r.userId,
      rating: r.rating,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      draws: r.draws ?? 0,
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
      user: r.user,
    }));

    const res = NextResponse.json({ ok: true, count: standings.length, standings });
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("[ladder/standings] GET failed:", err);
    return NextResponse.json({ ok: false, error: "ladder_standings_failed" }, { status: 500 });
  }
}
