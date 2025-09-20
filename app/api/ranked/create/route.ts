import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function newSeed() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const seed = newSeed();
  const match = await prisma.rankedMatch.create({
    data: {
      kind: "DUEL",            // 👈 friend link
      seed,
      playerOneId: session.user.id,
    },
  });

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const shareUrl = `${base}/play/ranked/${match.id}`;
  return NextResponse.json({ ...match, shareUrl });
}
