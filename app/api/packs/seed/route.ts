export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const rows = [
    {
      slug: "basic",
      name: "Basic Pack",
      description: "Affordable pack with standard odds.",
      coinCost: 200,
      pieceCost: 0,
      cardsPerPack: 3,
      rarityWeights: { COMMON: 0.65, RARE: 0.25, EPIC: 0.08, LEGENDARY: 0.02 },
    },
    {
      slug: "advanced",
      name: "Advanced Pack",
      description: "Better chances at higher rarities.",
      coinCost: 600,
      pieceCost: 0,
      cardsPerPack: 3,
      rarityWeights: { COMMON: 0.45, RARE: 0.35, EPIC: 0.15, LEGENDARY: 0.05 },
    },
    {
      slug: "special",
      name: "Special Pack",
      description: "Puzzle Piece pack with epic+ focused odds.",
      coinCost: 0,
      pieceCost: 3,
      cardsPerPack: 3,
      rarityWeights: { COMMON: 0.35, RARE: 0.35, EPIC: 0.20, LEGENDARY: 0.10 },
    },
  ];

  for (const r of rows) {
    await prisma.packType.upsert({
      where: { slug: r.slug },
      create: r as any,
      update: {
        name: r.name,
        description: r.description,
        coinCost: r.coinCost,
        pieceCost: r.pieceCost,
        cardsPerPack: r.cardsPerPack,
        rarityWeights: r.rarityWeights as any,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
