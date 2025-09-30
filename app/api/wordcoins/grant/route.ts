import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { amount, reason } = await req.json();
  const delta = Number(amount) || 0;
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "bad amount" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Ensure wallet exists
    await tx.wordcoinWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });

    // Create ledger txn
    await tx.wordcoinTxn.create({
      data: { userId, amount: delta, reason: reason ?? null },
    });

    // Update balance
    const updated = await tx.wordcoinWallet.update({
      where: { userId },
      data: { balance: { increment: delta } },
    });

    return { balance: updated.balance };
  });

  return NextResponse.json(result);
}
