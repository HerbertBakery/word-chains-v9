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

  if (handle.length < 3 || handle.length > 20) {
    return { ok: false, message: "Use 3–20 characters." } as const;
  }
  if (!/^[a-z0-9._]+$/.test(handle)) {
    return { ok: false, message: "Only a–z, 0–9, dot (.) and underscore (_)." } as const;
  }
  if (/^[._]/.test(handle) || /[._]$/.test(handle)) {
    return { ok: false, message: "Can't start or end with \".\" or \"_\"." } as const;
  }
  if (/[._]{2,}/.test(handle)) {
    return { ok: false, message: "No consecutive dots/underscores." } as const;
  }
  if (RESERVED.has(handle)) {
    return { ok: false, message: "That name is reserved." } as const;
  }
  if (handle.startsWith("anon_")) {
    return { ok: false, message: "Please choose a custom name." } as const;
  }

  return { ok: true, handle } as const;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = (body?.username ?? "") as string;

  const v = validateHandle(raw);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: 400 });

  const existing = await prisma.user.findFirst({
    where: { username: { equals: v.handle, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const saved = await prisma.user.update({
    where: { id: userId },
    data: { username: v.handle },
    select: { id: true, username: true, name: true, image: true },
  });

  return NextResponse.json({ ok: true, user: saved });
}
