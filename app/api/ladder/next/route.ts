// app/api/ladder/next/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newSeed } from "@/lib/seed";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const me = session.user.id;

  // Ensure Elo row exists
  await prisma.rankedRating.upsert({
    where: { userId: me },
    update: {},
    create: { userId: me, rating: 1200 },
  });

  // OPTIONAL: If I already have an unfinished ladder game where I was playerOne but haven't played yet,
  // you can return that seed to resume instead of creating a new one.
  // const myUnplayed = await prisma.rankedMatch.findFirst({
  //   where: { kind: "LADDER", playerOneId: me, playerOneChainLength: null, winnerId: null },
  //   orderBy: { createdAt: "asc" },
  //   select: { id: true, seed: true },
  // });
  // if (myUnplayed) return NextResponse.json({ role: "playerOne", matchId: myUnplayed.id, seed: myUnplayed.seed });

  // 1) Try to TAKE an opponent’s pending seed atomically:
  //    Find the oldest match where opponent already played (playerOneChainLength != null)
  //    and no playerTwo yet, and claim playerTwo in a single conditional update.
  const candidate = await prisma.rankedMatch.findFirst({
    where: {
      kind: "LADDER",
      playerTwoId: null,
      playerOneId: { not: me },
      playerOneChainLength: { not: null },
      winnerId: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, seed: true },
  });

  if (candidate) {
    // Conditional claim: only succeed if playerTwoId is still null
    const claimed = await prisma.rankedMatch.updateMany({
      where: { id: candidate.id, playerTwoId: null },
      data: { playerTwoId: me },
    });
    if (claimed.count === 1) {
      return NextResponse.json({ role: "playerTwo", matchId: candidate.id, seed: candidate.seed });
    }
    // If we lost the race, fall through and create a fresh one.
  }

  // 2) Create a new seed where we go first
  const seed = newSeed(8);
  const created = await prisma.rankedMatch.create({
    data: { kind: "LADDER", seed, playerOneId: me },
    select: { id: true, seed: true },
  });

  return NextResponse.json({ role: "playerOne", matchId: created.id, seed: created.seed });
}
