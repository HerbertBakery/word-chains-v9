-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "CardCategory" AS ENUM ('name', 'animal', 'country', 'food', 'brand', 'screen');

-- CreateTable
CREATE TABLE "WordCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" "CardCategory" NOT NULL,
    "rarity" "CardRarity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "cardId" TEXT,

    CONSTRAINT "DeckSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "coinsSpent" INTEGER NOT NULL DEFAULT 0,
    "piecesSpent" INTEGER NOT NULL DEFAULT 0,
    "cardsGranted" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordCard_userId_createdAt_idx" ON "WordCard"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DeckSlot_userId_idx" ON "DeckSlot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckSlot_userId_slotIndex_key" ON "DeckSlot"("userId", "slotIndex");

-- CreateIndex
CREATE INDEX "PackPurchase_userId_createdAt_idx" ON "PackPurchase"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WordCard" ADD CONSTRAINT "WordCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckSlot" ADD CONSTRAINT "DeckSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckSlot" ADD CONSTRAINT "DeckSlot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "WordCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPurchase" ADD CONSTRAINT "PackPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
