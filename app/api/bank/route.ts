// app/api/bank/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ok = (json: any, init: number | ResponseInit = 200) =>
  NextResponse.json(json, typeof init === "number" ? { status: init } : init);
const bad = (msg: string, code = 400) => ok({ ok: false, error: msg }, code);

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return bad("auth required", 401);

  // Return ONLY the current user's inventory (WordCard)
  const cards = await prisma.wordCard.findMany({
    where: { userId },
    select: {
      id: true,
      word: true,
      category: true, // enum CardCategory: "name" | "animal" | ...
      rarity: true,   // enum CardRarity: "COMMON" | "RARE" | ...
      createdAt: true,
    },
    orderBy: [{ rarity: "asc" }, { createdAt: "desc" }],
  });

  // Shape matches your useBank/BankCard (category already lowercase strings from enum)
  return ok({ ok: true, cards });
}
