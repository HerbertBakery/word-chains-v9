/*
  Warnings:

  - You are about to drop the column `timeTakenMs` on the `DailyRun` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."idx_alltime_fastest";

-- DropIndex
DROP INDEX "public"."idx_date_fastest";

-- AlterTable
ALTER TABLE "public"."DailyRun" DROP COLUMN "timeTakenMs",
ADD COLUMN     "timeTakenSec" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "idx_date_speed" ON "public"."DailyRun"("dateKey", "completedAll", "timeTakenSec" ASC);

-- CreateIndex
CREATE INDEX "idx_spec_speed" ON "public"."DailyRun"("specId", "completedAll", "timeTakenSec" ASC);
