-- CreateIndex
CREATE INDEX "RankedMatch_completedAt_idx" ON "public"."RankedMatch"("completedAt");

-- CreateIndex
CREATE INDEX "idx_rating_updatedAt" ON "public"."RankedRating"("rating", "updatedAt");
