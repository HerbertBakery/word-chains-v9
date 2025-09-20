-- CreateEnum
CREATE TYPE "public"."RankedKind" AS ENUM ('DUEL', 'LADDER');

-- AlterTable
ALTER TABLE "public"."RankedMatch" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "kind" "public"."RankedKind" NOT NULL DEFAULT 'DUEL',
ADD COLUMN     "ratingDeltaOne" INTEGER,
ADD COLUMN     "ratingDeltaTwo" INTEGER;

-- CreateTable
CREATE TABLE "public"."RankedRating" (
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedRating_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."LadderTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedMatchId" TEXT,

    CONSTRAINT "LadderTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LadderTicket_createdAt_idx" ON "public"."LadderTicket"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LadderTicket_userId_key" ON "public"."LadderTicket"("userId");

-- AddForeignKey
ALTER TABLE "public"."RankedRating" ADD CONSTRAINT "RankedRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LadderTicket" ADD CONSTRAINT "LadderTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
