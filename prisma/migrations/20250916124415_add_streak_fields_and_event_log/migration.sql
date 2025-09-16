-- CreateEnum
CREATE TYPE "public"."StreakKind" AS ENUM ('PLAYED_ANY_MODE', 'COMPLETED_DAILY_PUZZLE');

-- AlterTable
ALTER TABLE "public"."PlayerStats" ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCompletedAt" TIMESTAMP(3),
ADD COLUMN     "lastPlayedAt" TIMESTAMP(3),
ADD COLUMN     "puzzleStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."StreakEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "public"."StreakKind" NOT NULL,
    "occurred" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StreakEvent_userId_occurred_idx" ON "public"."StreakEvent"("userId", "occurred");

-- AddForeignKey
ALTER TABLE "public"."StreakEvent" ADD CONSTRAINT "StreakEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."PlayerStats"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
