// app/api/ranked/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET → fetch match by id
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const match = await prisma.rankedMatch.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}

/**
 * PATCH → friend flow: join as playerTwo if slot is free
 * (Ladder flow does not use this; it assigns playerTwo in /api/ladder/next)
 */
export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const me = session.user.id;

  const match = await prisma.rankedMatch.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // already in the match
  if (match.playerOneId === me || match.playerTwoId === me) {
    return NextResponse.json(match);
  }

  // try to claim the second seat atomically (race-safe)
  const claimed = await prisma.rankedMatch.updateMany({
    where: { id: match.id, playerTwoId: null },
    data: { playerTwoId: me },
  });

  if (claimed.count === 1) {
    const updated = await prisma.rankedMatch.findUnique({ where: { id: match.id } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Match is full" }, { status: 409 });
}

/**
 * PUT → submit your result (chainLength, score)
 * Works for both DUEL and LADDER.
 * - When both sides have submitted, resolves winner (longest chain; score tiebreak).
 * - For LADDER, applies Elo exactly once using a conditional claim.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const me = session.user.id;

  const body = await req.json().catch(() => ({}));
  const chainLength = Number(body?.chainLength);
  const score = Number(body?.score);
  if (!Number.isFinite(chainLength) || chainLength < 0 || !Number.isFinite(score) || score < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const match = await prisma.rankedMatch.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Must be a participant (or be playerOne if playerTwo not yet set)
  const isP1 = match.playerOneId === me;
  const isP2 = match.playerTwoId === me;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not your match" }, { status: 403 });
  }

  // Apply this player's submission
  const data =
    isP1
      ? { playerOneChainLength: chainLength, playerOneScore: score }
      : { playerTwoChainLength: chainLength, playerTwoScore: score };

  let updated = await prisma.rankedMatch.update({
    where: { id: match.id },
    data,
  });

  // If both sides have submitted and winner not decided yet → decide & (if LADDER) Elo
  if (
    updated.playerOneChainLength !== null &&
    updated.playerTwoChainLength !== null &&
    !updated.winnerId
  ) {
    // Determine winner locally (longest chain; score tiebreak; exact tie -> null)
    let winnerId: string | null = null;
    if (updated.playerOneChainLength! > updated.playerTwoChainLength!) winnerId = updated.playerOneId!;
    else if (updated.playerTwoChainLength! > updated.playerOneChainLength!) winnerId = updated.playerTwoId!;
    else {
      const s1 = updated.playerOneScore || 0;
      const s2 = updated.playerTwoScore || 0;
      if (s1 > s2) winnerId = updated.playerOneId!;
      else if (s2 > s1) winnerId = updated.playerTwoId!;
      // exact tie -> leave winnerId = null
    }

    // Race-safe claim: only one caller sets winner/completedAt
    const claim = await prisma.rankedMatch.updateMany({
      where: { id: updated.id, winnerId: null },
      data: { winnerId, completedAt: new Date() },
    });

    if (claim.count === 1 && updated.kind === "LADDER" && updated.playerOneId && updated.playerTwoId) {
      // We are the resolver → apply Elo once
      const [r1, r2] = await Promise.all([
        prisma.rankedRating.upsert({
          where: { userId: updated.playerOneId },
          update: {},
          create: { userId: updated.playerOneId, rating: 1200 },
        }),
        prisma.rankedRating.upsert({
          where: { userId: updated.playerTwoId },
          update: {},
          create: { userId: updated.playerTwoId, rating: 1200 },
        }),
      ]);

      // Scores for Elo (1/0.5/0)
      let s1 = 0.5, s2 = 0.5;
      if (winnerId) {
        s1 = winnerId === updated.playerOneId ? 1 : 0;
        s2 = 1 - s1;
      }

      const K = 32;
      const expected = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const e1 = expected(r1.rating, r2.rating);
      const delta1 = Math.round(K * (s1 - e1));
      const delta2 = -delta1;

      await prisma.$transaction([
        prisma.rankedRating.update({
          where: { userId: r1.userId },
          data: {
            rating: r1.rating + delta1,
            wins: r1.wins + (s1 === 1 ? 1 : 0),
            losses: r1.losses + (s1 === 0 ? 1 : 0),
            draws: r1.draws + (s1 === 0.5 ? 1 : 0),
          },
        }),
        prisma.rankedRating.update({
          where: { userId: r2.userId },
          data: {
            rating: r2.rating + delta2,
            wins: r2.wins + (s2 === 1 ? 1 : 0),
            losses: r2.losses + (s2 === 0 ? 1 : 0),
            draws: r2.draws + (s2 === 0.5 ? 1 : 0),
          },
        }),
        prisma.rankedMatch.update({
          where: { id: updated.id },
          data: { ratingDeltaOne: delta1, ratingDeltaTwo: delta2 },
        }),
      ]);
    }

    // Reload so client sees winner/deltas immediately
    updated = await prisma.rankedMatch.findUnique({ where: { id: updated.id } }) as NonNullable<typeof updated>;
  }

  return NextResponse.json(updated);
}
