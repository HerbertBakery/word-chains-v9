// app/api/wordcoins/balance/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ balance: 0 });

  const wallet = await prisma.wordcoinWallet.findUnique({ where: { userId } });
  if (wallet) {
    return NextResponse.json({ balance: wallet.balance });
  }

  // ✅ First-time/legacy init: create wallet at 100 and record a txn
  const created = await prisma.$transaction(async (tx) => {
    const w = await tx.wordcoinWallet.create({
      data: { userId, balance: 100 },
    });
    await tx.wordcoinTxn.create({
      data: { userId, amount: 100, reason: { type: "onboarding_bonus_lazy" } },
    });
    return w;
  });

  return NextResponse.json({ balance: created.balance });
}
