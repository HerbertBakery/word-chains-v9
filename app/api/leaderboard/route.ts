import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MetricKey =
  | "points"
  | "longest_chain"
  | "highest_multiplier"
  | "animals"
  | "countries"
  | "names"
  | "unique_words"
  | "badges";

const FIELD_MAP: Record<MetricKey, keyof import("@prisma/client").PlayerStats> = {
  points:             "bestScore",
  longest_chain:      "longestChain",
  highest_multiplier: "highestMultiplier",
  animals:            "animals",
  countries:          "countries",
  names:              "names",
  unique_words:       "uniqueWords",
  badges:             "badges",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const metricParam = (searchParams.get("metric") ?? "points") as MetricKey;
  const field = FIELD_MAP[metricParam] ?? "bestScore";

  const rows = await prisma.playerStats.findMany({
    orderBy: { [field]: "desc" },
    take: 100,
    include: { user: true },
  });

  const leaders = rows.map((r) => ({
    userId:  r.userId,
    username: r.user?.username ?? r.user?.name ?? null, // your schema has `username` on User
    handle:   r.user?.username ?? null,                 // your UI uses .handle for /u/[handle]; reuse username here
    image:    r.user?.image ?? null,
    value:    (r as any)[field] ?? 0,
  }));

  return NextResponse.json({ leaders });
}
