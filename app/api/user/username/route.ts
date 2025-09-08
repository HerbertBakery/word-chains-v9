// app/api/user/username/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

const RESERVED = new Set([
  "admin","root","system","support","help","contact",
  "leaderboard","login","logout","signup","signout","stats","api","u","user","users"
]);

function validateHandle(raw: string) {
  const handle = (raw || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return { ok: false, message: "Usernames must be 3–20 chars: a–z, 0–9, underscore." };
  }
  if (RESERVED.has(handle)) return { ok: false, message: "That name is reserved." };
  if (handle.startsWith("anon_")) return { ok: false, message: "Please choose a custom name." };
  return { ok: true, handle };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  const v = validateHandle(username);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: 400 });

  const existing = await prisma.user.findFirst({
    where: { username: { equals: v.handle!, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const saved = await prisma.user.update({
    where: { id: userId },
    data: { username: v.handle! },
    select: { id: true, username: true, name: true, image: true },
  });

  return NextResponse.json({ ok: true, user: saved });
}
