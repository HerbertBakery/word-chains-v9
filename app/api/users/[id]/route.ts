// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      image: true,
      stats: true, // PlayerStats relation (named `stats` in schema)
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    username: user.username ?? "Player",
    image: user.image,
    stats: user.stats,
    badges: user.stats?.badges ?? 0,
  });
}
