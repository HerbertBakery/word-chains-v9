// app/api/packs/types/route.ts
import { NextResponse } from "next/server";

/**
 * Static pack definitions to match app/packs/page.tsx UI:
 * - coin_small  → WordPack (coins)
 * - piece_elite → Puzzle Piece Pack (pieces)
 */
const PACK_TYPES = [
  {
    id: "coin_small",
    slug: "coin_small",
    name: "WordPack",
    description: "A starter pack with 3 cards.",
    coinCost: 100,   // matches UI_PACKS cost
    pieceCost: 0,
    cardsPerPack: 3, // matches UI count
    rarityWeights: { COMMON: 70, RARE: 25, EPIC: 4, LEGENDARY: 1 },
  },
  {
    id: "piece_elite",
    slug: "piece_elite",
    name: "Puzzle Piece Pack",
    description: "A puzzle-piece pack with better loot.",
    coinCost: 0,
    pieceCost: 5,    // matches UI_PACKS cost
    cardsPerPack: 5, // matches UI count
    rarityWeights: { COMMON: 60, RARE: 28, EPIC: 9, LEGENDARY: 3 },
  },
];

export async function GET() {
  return NextResponse.json({ types: PACK_TYPES });
}
