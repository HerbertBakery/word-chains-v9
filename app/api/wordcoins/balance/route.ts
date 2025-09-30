import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ balance: 0 });

  const wallet = await prisma.wordcoinWallet.findUnique({ where: { userId } });
  return NextResponse.json({ balance: wallet?.balance ?? 0 });
}
