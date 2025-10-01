// app/api/packs/types/route.ts
import { NextResponse } from "next/server";

/**
 * No PackType model in Prisma schema, so we serve a static list for now.
 * Keep the shape compatible with your previous select:
 * { id, slug, name, description, coinCost, pieceCost, cardsPerPack, rarityWeights }
 */
const PACK_TYPES = [
  {
    id: "coin_small",
    slug: "coin_small",
    name: "Coin Pack (Small)",
    description: "A small pack with 3 cards.",
    coinCost: 100,
    pieceCost: 0,
    cardsPerPack: 3,
    rarityWeights: { COMMON: 70, RARE: 25, EPIC: 4, LEGENDARY: 1 },
  },
  {
    id: "coin_big",
    slug: "coin_big",
    name: "Coin Pack (Big)",
    description: "Bigger pack with higher rare chance.",
    coinCost: 250,
    pieceCost: 0,
    cardsPerPack: 3,
    rarityWeights: { COMMON: 60, RARE: 30, EPIC: 8, LEGENDARY: 2 },
  },
  {
    id: "piece_elite",
    slug: "piece_elite",
    name: "Elite Piece Pack",
    description: "Premium pack with best odds.",
    coinCost: 0,
    pieceCost: 1,
    cardsPerPack: 3,
    rarityWeights: { COMMON: 50, RARE: 35, EPIC: 12, LEGENDARY: 3 },
  },
];

export async function GET() {
  // If other code expects a bare array instead of {types}, change this line to: return NextResponse.json(PACK_TYPES)
  return NextResponse.json({ types: PACK_TYPES });
}
