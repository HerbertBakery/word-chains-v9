// /app/api/stats/ingest/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// number helpers (your schema uses Ints)
const num = (v: unknown, fb = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const int = (v: unknown, fb = 0) => Math.round(num(v, fb));

// Robust: get userId from NextAuth Prisma Session via cookie
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

export async function POST(req: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Per-run payload from the game
  const run = {
    bestScore:            int(body.bestScore),
    longestChain:         int(body.longestChain),
    highestMultiplier:    int(body.highestMultiplier),

    totalWords:           int(body.totalWords),
    uniqueWords:          int(body.uniqueWords),

    animals:              int(body.animals),
    countries:            int(body.countries),
    names:                int(body.names),
    sameLetterWords:      int(body.sameLetterWords),

    switches:             int(body.switches),
    linksEarned:          int(body.linksEarned), // NOTE: rounds 0.5 to 1; change schema to Float if you want halves
    linksSpent:           int(body.linksSpent),

    // Optional per-run records if you send them:
    longestAnimalStreak:  int(body.longestAnimalStreak),
    longestCountryStreak: int(body.longestCountryStreak),
    longestNameStreak:    int(body.longestNameStreak),
    highestWordScore:     int(body.highestWordScore),
  };

  const existing = await prisma.playerStats.findUnique({ where: { userId } });

  if (!existing) {
    await prisma.playerStats.create({
      data: {
        userId,

        totalWords:        run.totalWords,
        uniqueWords:       run.uniqueWords,
        animals:           run.animals,
        countries:         run.countries,
        names:             run.names,
        sameLetterWords:   run.sameLetterWords,
        switches:          run.switches,
        linksEarned:       run.linksEarned,
        linksSpent:        run.linksSpent,

        bestScore:         run.bestScore,
        longestChain:      run.longestChain,
        highestMultiplier: run.highestMultiplier,

        longestAnimalStreak:  run.longestAnimalStreak,
        longestCountryStreak: run.longestCountryStreak,
        longestNameStreak:    run.longestNameStreak,

        // badges stays default; you can compute server-side later
      },
    });
  } else {
    await prisma.playerStats.update({
      where: { userId },
      data: {
        // accumulate totals
        totalWords:        existing.totalWords      + run.totalWords,
        uniqueWords:       existing.uniqueWords     + run.uniqueWords, // true global de-dup needs word history
        animals:           existing.animals         + run.animals,
        countries:         existing.countries       + run.countries,
        names:             existing.names           + run.names,
        sameLetterWords:   existing.sameLetterWords + run.sameLetterWords,
        switches:          existing.switches        + run.switches,
        linksEarned:       existing.linksEarned     + run.linksEarned,
        linksSpent:        existing.linksSpent      + run.linksSpent,

        // keep bests
        bestScore:         Math.max(existing.bestScore,         run.bestScore),
        longestChain:      Math.max(existing.longestChain,      run.longestChain),
        highestMultiplier: Math.max(existing.highestMultiplier, run.highestMultiplier),

        // per-category & single-word records (max)
        longestAnimalStreak:  Math.max(existing.longestAnimalStreak,  run.longestAnimalStreak),
        longestCountryStreak: Math.max(existing.longestCountryStreak, run.longestCountryStreak),
        longestNameStreak:    Math.max(existing.longestNameStreak,    run.longestNameStreak),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
