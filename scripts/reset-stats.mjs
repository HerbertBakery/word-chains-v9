// scripts/reset-stats.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const EMAIL = process.env.EMAIL || null;
const ALL = process.env.ALL === "1";

async function main() {
  if (ALL) {
    const res = await prisma.playerStats.deleteMany({});
    console.log(`Deleted ${res.count} PlayerStats rows (GLOBAL RESET).`);
    return;
  }

  if (EMAIL) {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      console.error(`No user found with email: ${EMAIL}`);
      process.exit(1);
    }

    // Since PlayerStats has userId as @id, delete() is fine; if not present, ignore.
    await prisma.playerStats
      .delete({ where: { userId: user.id } })
      .catch(() => null);

    console.log(
      `Cleared stats for user ${user.id} (${user.email || "no-email"}) @${user.username || "no-username"}`
    );
    return;
  }

  console.log(
    `Usage:
  ALL=1 node scripts/reset-stats.mjs               # wipe ALL PlayerStats
  EMAIL=user@example.com node scripts/reset-stats.mjs  # wipe a single user's stats`
  );
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
