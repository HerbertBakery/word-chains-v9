// app/api/chaindex/progress/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATS = ["animal", "country", "screen", "brand", "food", "name"] as const;
type Cat = typeof CATS[number];

function emptyMap(): Record<Cat, string[]> {
  return { animal: [], country: [], screen: [], brand: [], food: [], name: [] };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const payload = { discovered: emptyMap(), claimed: emptyMap() };

  if (!session?.user?.id) {
    return NextResponse.json(payload);
  }

  const [discRows, unlockRows] = await Promise.all([
    prisma.dexDiscovery.findMany({
      where: { userId: session.user.id },
      select: { category: true, key: true },
    }),
    prisma.dexUnlock.findMany({
      where: { userId: session.user.id },
      select: { category: true, key: true },
    }),
  ]);

  for (const r of discRows) {
    const cat = r.category as Cat;
    if (CATS.includes(cat)) payload.discovered[cat].push(r.key);
  }
  for (const r of unlockRows) {
    const cat = r.category as Cat;
    if (CATS.includes(cat)) payload.claimed[cat].push(r.key);
  }

  return NextResponse.json(payload);
}
