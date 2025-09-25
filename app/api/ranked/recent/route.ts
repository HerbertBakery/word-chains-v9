import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  // When logged out, return an empty list so the UI never crashes
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json([]);
  }

  // Only this user's recent ranked matches (either side of the match)
  const matches = await prisma.rankedMatch.findMany({
    where: {
      OR: [{ playerOneId: userId }, { playerTwoId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      playerOne: { select: { id: true, name: true, username: true, image: true } },
      playerTwo: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json(matches);
}
