-- AlterTable
ALTER TABLE "public"."DailyRun" ADD COLUMN     "timeTakenMs" INTEGER;

-- CreateIndex
CREATE INDEX "idx_date_fastest" ON "public"."DailyRun"("dateKey", "completedAll", "timeTakenMs" ASC, "createdAt");

-- CreateIndex
CREATE INDEX "idx_alltime_fastest" ON "public"."DailyRun"("completedAll", "timeTakenMs" ASC, "createdAt");
