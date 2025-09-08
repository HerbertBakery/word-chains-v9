// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      image: true,
      // NOTE: Do not select `stats` unless your Prisma schema defines a relation named `stats`
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Keep the response shape your UI expects, but provide safe fallbacks
  return NextResponse.json({
    id: user.id,
    username: user.username ?? "Player",
    image: user.image ?? null,
    stats: null,      // no relation available → null so UI shows 0s via ?? 0
    badges: 0,        // fallback
  });
}
