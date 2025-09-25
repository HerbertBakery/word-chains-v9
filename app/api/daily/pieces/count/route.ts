// app/api/daily/pieces/count/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ count: 0 }, {
      headers: { "cache-control": "no-store, max-age=0" },
    });
  }

  const count = await prisma.dailyPiece.count({ where: { userId } });
  return NextResponse.json({ count }, {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
