/*
  Warnings:

  - You are about to drop the `leaderboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wordchains_scores` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."leaderboard";

-- DropTable
DROP TABLE "public"."wordchains_scores";

-- CreateTable
CREATE TABLE "public"."PlayerStats" (
    "userId" TEXT NOT NULL,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "uniqueWords" INTEGER NOT NULL DEFAULT 0,
    "animals" INTEGER NOT NULL DEFAULT 0,
    "countries" INTEGER NOT NULL DEFAULT 0,
    "names" INTEGER NOT NULL DEFAULT 0,
    "sameLetterWords" INTEGER NOT NULL DEFAULT 0,
    "switches" INTEGER NOT NULL DEFAULT 0,
    "linksEarned" INTEGER NOT NULL DEFAULT 0,
    "linksSpent" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "longestChain" INTEGER NOT NULL DEFAULT 0,
    "highestMultiplier" INTEGER NOT NULL DEFAULT 0,
    "longestAnimalStreak" INTEGER NOT NULL DEFAULT 0,
    "longestCountryStreak" INTEGER NOT NULL DEFAULT 0,
    "longestNameStreak" INTEGER NOT NULL DEFAULT 0,
    "badges" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);
