import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Pull ELO standings, newest updates last write wins
  const rows = await prisma.rankedRating.findMany({
    orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
    take: 200, // adjust if you want more
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  // Normalize payload a bit for the UI
  const standings = rows.map((r) => ({
    userId: r.userId,
    rating: r.rating,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    updatedAt: r.updatedAt,
    user: r.user,
  }));

  return NextResponse.json({ ok: true, standings });
}
