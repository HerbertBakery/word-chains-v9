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

-- CreateIndex
CREATE INDEX "DexUnlock_userId_category_idx" ON "public"."DexUnlock"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DexUnlock_userId_category_key_key" ON "public"."DexUnlock"("userId", "category", "key");

-- CreateIndex
CREATE INDEX "DexDiscovery_userId_category_idx" ON "public"."DexDiscovery"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DexDiscovery_userId_category_key_key" ON "public"."DexDiscovery"("userId", "category", "key");

-- AddForeignKey
ALTER TABLE "public"."DexUnlock" ADD CONSTRAINT "DexUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DexDiscovery" ADD CONSTRAINT "DexDiscovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
