import { prisma } from "@/lib/prisma";

// Throws if not enough
export async function spendWordCoins(userId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.wordcoinWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
    const wallet = await tx.wordcoinWallet.findUnique({ where: { userId }, select: { balance: true } });
    const bal = wallet?.balance ?? 0;
    if (bal < amount) throw new Error("INSUFFICIENT_COINS");

    await tx.wordcoinTxn.create({ data: { userId, amount: -amount, reason: { kind: "pack_open" } } });
    await tx.wordcoinWallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
  });
}

export async function getAvailablePieces(userId: string) {
  const [earned, spentAgg] = await Promise.all([
    prisma.dailyPiece.count({ where: { userId } }),
    prisma.puzzleSpend.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);
  const spent = spentAgg._sum.amount ?? 0;
  return Math.max(0, earned - spent);
}

// Throws if not enough
export async function spendPuzzlePieces(userId: string, amount: number) {
  if (amount <= 0) return;
  const available = await getAvailablePieces(userId);
  if (available < amount) throw new Error("INSUFFICIENT_PIECES");
  await prisma.puzzleSpend.create({ data: { userId, amount } });
}
