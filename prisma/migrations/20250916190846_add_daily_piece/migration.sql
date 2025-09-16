-- CreateTable
CREATE TABLE "public"."DailyPiece" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyPiece_userId_dateKey_idx" ON "public"."DailyPiece"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPiece_userId_dateKey_key" ON "public"."DailyPiece"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "public"."DailyPiece" ADD CONSTRAINT "DailyPiece_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
