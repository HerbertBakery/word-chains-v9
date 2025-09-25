export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodaySpec } from "@/lib/dailySpec";

type Body = {
  id: string; // spec.id (same as dateKey)
  score: number;
  wordsPlayed?: string[];
  catsCount?: Record<string, number>;
  sameEnds?: number;
  maxChain?: number;
  startedAt?: number;      // server-start ms (echoed from /api/daily/today)
  specSig?: string;
  completedAll?: boolean;  // beat the daily goals
  deviceId?: string | null; // optional (we’ll also set/read a cookie)
  // Legacy hint (not required): client-side computed seconds
  timeTakenSec?: number;
};

const DEVICE_COOKIE = "wc_device";

// Small helpers
const round2 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Award helper: create today's piece once (idempotent) and bump streak once for signed-in users.
async function awardForSignedInUser(userId: string, dateKey: string) {
  let awardedPiece = false;
  let streak: { current: number; best: number } | null = null;

  const existingPiece = await prisma.dailyPiece.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
    select: { id: true },
  });

  if (!existingPiece) {
    await prisma.dailyPiece.create({ data: { userId, dateKey } });
    awardedPiece = true;

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
  }

  return { awardedPiece, streak };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body.id !== "string" || typeof body.score !== "number") {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Server truth for today
    const { dateKey, spec } = await getTodaySpec();

    // Validate “today”
    if (body.id !== dateKey) {
      return NextResponse.json({ ok: false, error: "Invalid daily for today" }, { status: 400 });
    }
    // Optional signature check
    if (body.specSig && body.specSig !== spec.signature) {
      return NextResponse.json({ ok: false, error: "Spec signature mismatch" }, { status: 400 });
    }

    // ---------- Compute authoritative timeTakenSec ----------
    // We compute from server-started timestamp when provided; fall back to client hint if present.
    const totalAllowed = Number(spec.timeSeconds ?? 120);
    let computedTimeTaken: number | null = null;

    if (typeof body.startedAt === "number" && Number.isFinite(body.startedAt) && body.startedAt > 0) {
      const elapsedSec = (Date.now() - Number(body.startedAt)) / 1000;
      computedTimeTaken = round2(clamp(elapsedSec, 0, totalAllowed));
    } else if (typeof body.timeTakenSec === "number" && Number.isFinite(body.timeTakenSec)) {
      computedTimeTaken = round2(clamp(body.timeTakenSec, 0, totalAllowed));
    } // else leave null; we never write null over an existing good time

    // Identify player
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined;

    const jar = cookies();
    let cookieDeviceId = jar.get(DEVICE_COOKIE)?.value ?? undefined;
    let deviceId = body.deviceId ?? cookieDeviceId;

    // If no user and no device, mint a device id (cookie)
    if (!userId && !deviceId) {
      deviceId = `dev_${crypto.randomUUID()}`;
      jar.set(DEVICE_COOKIE, deviceId, {
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

    // ---------- Guest → User claim ----------
    // If a user signs in after playing as a guest, claim their device run once.
    let claimAwardedPiece = false;
    let claimStreak: { current: number; best: number } | null = null;

    if (userId && deviceId) {
      const existingDeviceRun = await prisma.dailyRun.findFirst({
        where: { specId, deviceId },
        select: { id: true, completedAll: true }
      });
      const existingUserRun = await prisma.dailyRun.findFirst({
        where: { specId, userId },
        select: { id: true, completedAll: true }
      });

      if (existingDeviceRun && !existingUserRun) {
        // Attach the guest run to the user
        await prisma.dailyRun.update({
          where: { id: existingDeviceRun.id },
          data: { userId, deviceId: null }
        });

        // If that run had already cleared, award piece *now* (once).
        if (existingDeviceRun.completedAll) {
          const res = await awardForSignedInUser(userId, dateKey);
          claimAwardedPiece = res.awardedPiece;
          claimStreak = res.streak;
        }

        // From here on, ignore deviceId for today (so we write against the user)
        deviceId = undefined;
      }
    }

    // ---------- Upsert today’s run for this identity ----------
    const dbPayload = {
      userId: userId ?? null,
      deviceId: userId ? null : (deviceId ?? null),
      specId,
      dateKey,
      score,
      wordsPlayed: Array.isArray(body.wordsPlayed) ? body.wordsPlayed.slice(-300) : [],
      catsJson: body.catsCount ?? {},
      sameEnds: Math.max(0, Math.floor(body.sameEnds ?? 0)),
      maxChain: Math.max(0, Math.floor(body.maxChain ?? 0)),
      completedAll,
      // NOTE: do NOT set timeTakenSec here; we decide below based on prior row & completedAll
    };

    const existing = await prisma.dailyRun.findFirst({
      where: {
        specId,
        OR: [
          userId ? { userId } : undefined,
          !userId && deviceId ? { deviceId } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, score: true, completedAll: true, timeTakenSec: true },
    });

    let alreadyPlayed = false;
    let timeTakenSecToReturn: number | null = null;

    if (!existing) {
      // First submission for today
      await prisma.dailyRun.create({
        data: {
          ...dbPayload,
          timeTakenSec: completedAll && computedTimeTaken != null ? computedTimeTaken : null,
        },
      });
      timeTakenSecToReturn = completedAll ? (computedTimeTaken ?? null) : null;
    } else {
      alreadyPlayed = true;

      // Should we update the row?
      const shouldUpdate =
        dbPayload.score > existing.score ||
        (!existing.completedAll && dbPayload.completedAll);

      if (shouldUpdate) {
        // Only write timeTakenSec when the NEW run is a clear; otherwise preserve previous value.
        const nextTime =
          completedAll && computedTimeTaken != null
            ? computedTimeTaken
            : (existing.timeTakenSec as number | null | undefined) ?? null;

        await prisma.dailyRun.update({
          where: { id: existing.id },
          data: {
            score: dbPayload.score,
            wordsPlayed: dbPayload.wordsPlayed,
            catsJson: dbPayload.catsJson,
            sameEnds: dbPayload.sameEnds,
            maxChain: dbPayload.maxChain,
            completedAll: existing.completedAll || dbPayload.completedAll,
            timeTakenSec: nextTime,
          },
        });

        timeTakenSecToReturn = completedAll ? (computedTimeTaken ?? (existing.timeTakenSec as number | null | undefined) ?? null) : ((existing.timeTakenSec as number | null | undefined) ?? null);
      } else {
        // No update; just echo any existing time (useful for the success page)
        timeTakenSecToReturn = (existing.timeTakenSec as number | null | undefined) ?? null;
      }
    }

    // ---------- Award today’s piece + bump streak (SIGNED-IN & CLEARED ONLY) ----------
    let awardedPiece = false;
    let streak: { current: number; best: number } | null = null;

    if (userId && (completedAll || claimAwardedPiece)) {
      const res = await awardForSignedInUser(userId, dateKey);
      awardedPiece = claimAwardedPiece || res.awardedPiece;
      streak = claimStreak || res.streak || null;
    }

    return NextResponse.json({
      ok: true,
      fullClear: completedAll,
      alreadyPlayed,
      timeTakenSec: timeTakenSecToReturn, // helpful for success screens / debugging
      // Only non-null when we actually bumped on this call (or claim)
      streak,
      awardedPiece,
      mustSignInToCollect: !userId && completedAll,
    });
  } catch (e: any) {
    console.error("[daily/submit] 500", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
