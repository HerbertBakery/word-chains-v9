// app/api/daily/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodaySpec } from "@/lib/dailySpec";

type Body = {
  id: string; // spec.id (we keep specId === dateKey)
  score: number;
  wordsPlayed?: string[];
  catsCount?: Record<string, number>;
  sameEnds?: number;
  maxChain?: number;
  startedAt?: number;
  specSig?: string;
  completedAll?: boolean;   // "beat the daily"
  deviceId?: string | null; // optional (we'll also use/set a cookie)
};

const DEVICE_COOKIE = "wc_device";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body.id !== "string" || typeof body.score !== "number") {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Server truth: today's spec
    const { dateKey, spec } = await getTodaySpec();

    // Validate the submission is for today
    if (body.id !== dateKey) {
      return NextResponse.json({ ok: false, error: "Invalid daily for today" }, { status: 400 });
    }
    // Signature check (optional but nice)
    if (body.specSig && body.specSig !== spec.signature) {
      return NextResponse.json({ ok: false, error: "Spec signature mismatch" }, { status: 400 });
    }

    // Identify the player
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined;

    const jar = cookies();
    let cookieDeviceId = jar.get(DEVICE_COOKIE)?.value ?? undefined;
    let deviceId = body.deviceId ?? cookieDeviceId;

    // If no user and no device, mint a device id and set cookie
    if (!userId && !deviceId) {
      deviceId = `dev_${crypto.randomUUID()}`;
      res.cookies.set(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    if (!userId && !deviceId) {
      return NextResponse.json({ ok: false, error: "Missing identity (user or deviceId)" }, { status: 400 });
    }

    const specId = dateKey;
    const score = Math.max(0, Math.floor(body.score));
    const completedAll = !!body.completedAll;

    // ----- Guest→User CLAIM LOGIC -----
    // If the user is signed in, prefer storing the run under userId.
    // If there is an existing guest/device run for the same day, attach it to the user.
    if (userId && deviceId) {
      const existingDeviceRun = await prisma.dailyRun.findFirst({
        where: { specId, deviceId },
        select: { id: true, score: true, completedAll: true }
      });
      const existingUserRun = await prisma.dailyRun.findFirst({
        where: { specId, userId },
        select: { id: true }
      });

      if (existingDeviceRun && !existingUserRun) {
        // Claim the guest row into the user account
        await prisma.dailyRun.update({
          where: { id: existingDeviceRun.id },
          data: { userId, deviceId: null }
        });
        // From this point on, we will ignore deviceId for writes today
        deviceId = undefined;
      }
    }

    // Map payload
    const dbPayload = {
      userId: userId ?? null,
      deviceId: userId ? null : (deviceId ?? null), // if user present, ensure leaderboard rows are user-bound
      specId,
      dateKey,
      score,
      wordsPlayed: Array.isArray(body.wordsPlayed) ? body.wordsPlayed.slice(-300) : [],
      catsJson: body.catsCount ?? {},
      sameEnds: Math.max(0, Math.floor(body.sameEnds ?? 0)),
      maxChain: Math.max(0, Math.floor(body.maxChain ?? 0)),
      completedAll,
    };

    // Find an existing row for THIS identity/spec
    const existing = await prisma.dailyRun.findFirst({
      where: {
        specId,
        OR: [
          userId ? { userId } : undefined,
          !userId && deviceId ? { deviceId } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, score: true, completedAll: true },
    });

    let alreadyPlayed = false;

    if (!existing) {
      await prisma.dailyRun.create({ data: dbPayload });
    } else {
      alreadyPlayed = true;
      const shouldUpdate =
        dbPayload.score > existing.score ||
        (!existing.completedAll && dbPayload.completedAll);

      if (shouldUpdate) {
        await prisma.dailyRun.update({
          where: { id: existing.id },
          data: {
            score: dbPayload.score,
            wordsPlayed: dbPayload.wordsPlayed,
            catsJson: dbPayload.catsJson,
            sameEnds: dbPayload.sameEnds,
            maxChain: dbPayload.maxChain,
            completedAll: existing.completedAll || dbPayload.completedAll,
          },
        });
      }
    }

    // ----- Fire Streak (any mode) & Daily puzzle piece -----
    // For Daily: we count a “completion” only if completedAll=true.
    // (If you want streak for partial/any play, set a different condition.)
    let streak: { current: number; best: number } | null = null;
    let awardedPiece = false;

    if (userId && completedAll) {
      // 1) increment the fire streak (global, any mode) — reuse dailyStreak table or make a new one.
      const s = await prisma.dailyStreak.findUnique({ where: { userId } });
      if (!s) {
        const created = await prisma.dailyStreak.create({
          data: { userId, current: 1, best: 1 },
          select: { current: true, best: true },
        });
        streak = created;
      } else {
        const nextCurrent = s.current + 1;
        const nextBest = Math.max(s.best, nextCurrent);
        const updated = await prisma.dailyStreak.update({
          where: { userId },
          data: { current: nextCurrent, best: nextBest, updatedAt: new Date() },
          select: { current: true, best: true },
        });
        streak = updated;
      }

      // 2) award one puzzle piece for beating today's Daily
      await prisma.dailyPiece.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        update: {},        // already awarded today → no-op
        create: { userId, dateKey }
      });
      awardedPiece = true;
    }

    return NextResponse.json({
      ok: true,
      fullClear: completedAll,
      alreadyPlayed,
      streak,
      awardedPiece,
    }, { headers: res.headers });
  } catch (e: any) {
    console.error("[daily/submit] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
