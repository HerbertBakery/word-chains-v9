-- Backup legacy table (if present)
CREATE TABLE IF NOT EXISTS "leaderboard_backup" AS TABLE "leaderboard" WITH DATA;

-- Drop the drift source (table not managed by Prisma)
DROP TABLE IF EXISTS "leaderboard";
