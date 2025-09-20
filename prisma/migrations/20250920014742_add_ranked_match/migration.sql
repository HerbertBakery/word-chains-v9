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
CREATE TABLE "public"."RankedMatch" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerOneId" TEXT NOT NULL,
    "playerTwoId" TEXT,
    "playerOneChainLength" INTEGER,
    "playerOneScore" INTEGER,
    "playerTwoChainLength" INTEGER,
    "playerTwoScore" INTEGER,
    "winnerId" TEXT,

    CONSTRAINT "RankedMatch_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "RankedMatch_createdAt_idx" ON "public"."RankedMatch"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ChainRun" ADD CONSTRAINT "ChainRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedMatch" ADD CONSTRAINT "RankedMatch_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedMatch" ADD CONSTRAINT "RankedMatch_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
