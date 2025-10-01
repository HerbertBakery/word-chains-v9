-- CreateEnum
CREATE TYPE "public"."StreakKind" AS ENUM ('PLAYED_ANY_MODE', 'COMPLETED_DAILY_PUZZLE');

-- CreateEnum
CREATE TYPE "public"."RankedKind" AS ENUM ('DUEL', 'LADDER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "username" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dailyStreak" INTEGER NOT NULL DEFAULT 0,
    "puzzleStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."DailyRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "specId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "wordsPlayed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "catsJson" JSONB NOT NULL DEFAULT '{}',
    "sameEnds" INTEGER NOT NULL DEFAULT 0,
    "maxChain" INTEGER NOT NULL DEFAULT 0,
    "completedAll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeTakenSec" DOUBLE PRECISION,

    CONSTRAINT "DailyRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyStreak" (
    "userId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStreak_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."StreakEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "public"."StreakKind" NOT NULL,
    "occurred" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyPiece" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChainRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "deviceId" TEXT,
    "playerName" TEXT,
    "seasonKey" TEXT NOT NULL DEFAULT 'global',
    "score" INTEGER NOT NULL,
    "longestChain" INTEGER NOT NULL,

    CONSTRAINT "ChainRun_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."RankedMatch" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "public"."RankedKind" NOT NULL DEFAULT 'DUEL',
    "playerOneId" TEXT NOT NULL,
    "playerTwoId" TEXT,
    "playerOneChainLength" INTEGER,
    "playerOneScore" INTEGER,
    "playerTwoChainLength" INTEGER,
    "playerTwoScore" INTEGER,
    "ratingDeltaOne" INTEGER,
    "ratingDeltaTwo" INTEGER,
    "winnerId" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RankedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DexUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DexUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DexDiscovery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DexDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WordcoinWallet" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordcoinWallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."WordcoinTxn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordcoinTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "idx_spec_score" ON "public"."DailyRun"("specId", "score" DESC);

-- CreateIndex
CREATE INDEX "idx_date_score" ON "public"."DailyRun"("dateKey", "score" DESC);

-- CreateIndex
CREATE INDEX "idx_date_created" ON "public"."DailyRun"("dateKey", "createdAt");

-- CreateIndex
CREATE INDEX "idx_date_speed" ON "public"."DailyRun"("dateKey", "completedAll", "timeTakenSec" ASC);

-- CreateIndex
CREATE INDEX "idx_spec_speed" ON "public"."DailyRun"("specId", "completedAll", "timeTakenSec" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyRun_userId_specId_key" ON "public"."DailyRun"("userId", "specId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRun_deviceId_specId_key" ON "public"."DailyRun"("deviceId", "specId");

-- CreateIndex
CREATE INDEX "StreakEvent_userId_occurred_idx" ON "public"."StreakEvent"("userId", "occurred");

-- CreateIndex
CREATE INDEX "DailyPiece_userId_dateKey_idx" ON "public"."DailyPiece"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPiece_userId_dateKey_key" ON "public"."DailyPiece"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "idx_chain_season_score" ON "public"."ChainRun"("seasonKey", "score" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "idx_chain_season_longest" ON "public"."ChainRun"("seasonKey", "longestChain" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "idx_chain_created" ON "public"."ChainRun"("createdAt");

-- CreateIndex
CREATE INDEX "idx_chain_user" ON "public"."ChainRun"("userId");

-- CreateIndex
CREATE INDEX "idx_chain_device" ON "public"."ChainRun"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChainRun_userId_seasonKey_key" ON "public"."ChainRun"("userId", "seasonKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChainRun_deviceId_seasonKey_key" ON "public"."ChainRun"("deviceId", "seasonKey");

-- CreateIndex
CREATE INDEX "idx_rating_updatedAt" ON "public"."RankedRating"("rating", "updatedAt");

-- CreateIndex
CREATE INDEX "LadderTicket_createdAt_idx" ON "public"."LadderTicket"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LadderTicket_userId_key" ON "public"."LadderTicket"("userId");

-- CreateIndex
CREATE INDEX "RankedMatch_createdAt_idx" ON "public"."RankedMatch"("createdAt");

-- CreateIndex
CREATE INDEX "RankedMatch_completedAt_idx" ON "public"."RankedMatch"("completedAt");

-- CreateIndex
CREATE INDEX "DexUnlock_userId_category_idx" ON "public"."DexUnlock"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DexUnlock_userId_category_key_key" ON "public"."DexUnlock"("userId", "category", "key");

-- CreateIndex
CREATE INDEX "DexDiscovery_userId_category_idx" ON "public"."DexDiscovery"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DexDiscovery_userId_category_key_key" ON "public"."DexDiscovery"("userId", "category", "key");

-- CreateIndex
CREATE INDEX "idx_wc_user_created" ON "public"."WordcoinTxn"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyRun" ADD CONSTRAINT "DailyRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyStreak" ADD CONSTRAINT "DailyStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StreakEvent" ADD CONSTRAINT "StreakEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."PlayerStats"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPiece" ADD CONSTRAINT "DailyPiece_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChainRun" ADD CONSTRAINT "ChainRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedRating" ADD CONSTRAINT "RankedRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LadderTicket" ADD CONSTRAINT "LadderTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedMatch" ADD CONSTRAINT "RankedMatch_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedMatch" ADD CONSTRAINT "RankedMatch_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DexUnlock" ADD CONSTRAINT "DexUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DexDiscovery" ADD CONSTRAINT "DexDiscovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordcoinWallet" ADD CONSTRAINT "WordcoinWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordcoinTxn" ADD CONSTRAINT "WordcoinTxn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
