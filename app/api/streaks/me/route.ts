import { NextResponse } from "next/server";
import { safeGetServerSession } from "../../../../lib/session";
import { getMyStreaks } from "../../../../lib/streaks";

export async function GET() {
  const session = await safeGetServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getMyStreaks(userId);
  return NextResponse.json(data);
}
