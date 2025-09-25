// app/api/daily/claim/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodaySpec } from "@/lib/dailySpec";

const DEVICE_COOKIE = "wc_device";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { dateKey } = await getTodaySpec();
  const jar = cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value;

  if (!deviceId) return NextResponse.json({ ok: true, claimed: false, awardedPiece: false });

  // Find a guest run for today that isn’t attached to a user yet
  const guestRun = await prisma.dailyRun.findFirst({
    where: { specId: dateKey, deviceId },
    select: { id: true, completedAll: true },
  });

  if (!guestRun) return NextResponse.json({ ok: true, claimed: false, awardedPiece: false });

  // If the user already has today’s run, just detach the device and exit
  const userRun = await prisma.dailyRun.findFirst({
    where: { specId: dateKey, userId },
    select: { id: true, completedAll: true },
  });

  if (!userRun) {
    await prisma.dailyRun.update({
      where: { id: guestRun.id },
      data: { userId, deviceId: null },
    });
  } else {
    // Clean up guest deviceId to avoid re-claim attempts
    await prisma.dailyRun.update({
      where: { id: guestRun.id },
      data: { deviceId: null },
    });
  }

  // Award a piece if the guest run had actually cleared the puzzle
  let awardedPiece = false;
  if (guestRun.completedAll) {
    try {
      await prisma.dailyPiece.create({ data: { userId, dateKey } });
      awardedPiece = true;
    } catch {
      // unique constraint -> already awarded; ignore
    }
  }

  return NextResponse.json({ ok: true, claimed: true, awardedPiece });
}
