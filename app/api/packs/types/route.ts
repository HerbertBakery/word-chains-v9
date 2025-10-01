export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const types = await prisma.packType.findMany({
    orderBy: { coinCost: "asc" },
    select: { id: true, slug: true, name: true, description: true, coinCost: true, pieceCost: true, cardsPerPack: true, rarityWeights: true },
  });
  return NextResponse.json({ types });
}
