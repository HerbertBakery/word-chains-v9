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
CREATE INDEX "idx_wc_user_created" ON "public"."WordcoinTxn"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."WordcoinWallet" ADD CONSTRAINT "WordcoinWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordcoinTxn" ADD CONSTRAINT "WordcoinTxn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
