// lib/economy.ts
import { prisma } from "@/lib/prisma";

// Throws if not enough coins; decrements WordcoinWallet and logs WordcoinTxn
export async function spendWordCoins(userId: string, amount: number) {
  if (amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    // Ensure wallet exists
    await tx.wordcoinWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });

    const wallet = await tx.wordcoinWallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    const bal = wallet?.balance ?? 0;
    if (bal < amount) throw new Error("INSUFFICIENT_COINS");

    // Ledger entry
    await tx.wordcoinTxn.create({
      data: { userId, amount: -amount, reason: { kind: "pack_open" } },
    });

    // Decrement balance
    await tx.wordcoinWallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
  });
}

/**
 * Available puzzle pieces = DailyPiece earned minus total PackPurchase.piecesSpent
 * (Replaces old `puzzleSpend` table usage)
 */
export async function getAvailablePieces(userId: string) {
  const [earned, spentAgg] = await Promise.all([
    prisma.dailyPiece.count({ where: { userId } }),
    prisma.packPurchase.aggregate({
      where: { userId },
      _sum: { piecesSpent: true },
    }),
  ]);

  const spent = spentAgg._sum.piecesSpent ?? 0;
  return Math.max(0, earned - spent);
}

/**
 * Throws if not enough pieces; records the spend by creating a PackPurchase row
 * with `piecesSpent = amount` (no coins, no cards).
 *
 * If your pack-open route already creates a PackPurchase for piece packs,
 * you can remove this function from that flow to avoid double counting.
 */
export async function spendPuzzlePieces(userId: string, amount: number) {
  if (amount <= 0) return;

  const available = await getAvailablePieces(userId);
  if (available < amount) throw new Error("INSUFFICIENT_PIECES");

  // Record the spend using existing PackPurchase model as the ledger
  await prisma.packPurchase.create({
    data: {
      userId,
      packId: "piece_spend", // marker entry; adjust if you prefer the actual packId
      coinsSpent: 0,
      piecesSpent: amount,
      cardsGranted: [], // no cards granted by this ledger entry
    },
  });
}
