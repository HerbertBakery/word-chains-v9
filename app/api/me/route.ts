// /app/api/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<string | null> {
  const jar = cookies();
  const tok =
    jar.get("__Secure-next-auth.session-token")?.value ??
    jar.get("next-auth.session-token")?.value ??
    null;
  if (!tok) return null;
  const s = await prisma.session.findUnique({ where: { sessionToken: tok } });
  return s?.userId ?? null;
}

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.playerStats.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    user: {
      id: user?.id,
      name: user?.name,
      username: user?.username,
      email: user?.email,
      image: user?.image,
    },
    stats: stats ?? null,
  });
}
