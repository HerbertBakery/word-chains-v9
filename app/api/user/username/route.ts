export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { normalizeUsername, validateUsername } from "@/lib/username";

const RESERVED = new Set([
  "admin","root","system","support","help","contact",
  "leaderboard","login","logout","signup","signout","stats","api","u","user","users"
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = (body?.username ?? "") as string;

  // format validation (shared rule)
  const v = validateUsername(raw);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const handle = normalizeUsername(raw);

  // business rules
  if (RESERVED.has(handle)) {
    return NextResponse.json({ error: "That name is reserved." }, { status: 400 });
  }
  if (handle.startsWith("anon_")) {
    return NextResponse.json({ error: "Please choose a custom name." }, { status: 400 });
  }

  // uniqueness (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const saved = await prisma.user.update({
    where: { id: userId },
    data: { username: handle },
    select: { id: true, username: true, name: true, image: true },
  });

  return NextResponse.json({ ok: true, user: saved });
}
