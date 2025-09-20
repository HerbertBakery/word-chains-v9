// app/api/ranked/recent/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  // When logged out, return an empty list so the UI never crashes
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }

  // Recent ranked matches (adjust 'take' as desired)
  const matches = await prisma.rankedMatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      playerOne: { select: { id: true, name: true, username: true, image: true } },
      playerTwo: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  // You can map/augment here if needed; we return as-is
  return NextResponse.json(matches);
}
