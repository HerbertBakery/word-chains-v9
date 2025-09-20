// app/api/ladder/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const me = session.user.id;

  const row = await prisma.rankedRating.findUnique({ where: { userId: me } });
  return NextResponse.json({ rating: row?.rating ?? 1200, wins: row?.wins ?? 0, losses: row?.losses ?? 0, draws: row?.draws ?? 0 });
}
