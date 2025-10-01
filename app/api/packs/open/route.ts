export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

/* ================= Types & Config ================= */
type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
type CardCategory = "name" | "animal" | "country" | "food" | "brand" | "screen";

const PACKS = {
  coin_small: {
    id: "coin_small",
    label: "Coin Pack (Small)",
    currency: "COIN" as const,
    cost: 100,
    count: 3,
    drops: { COMMON: 0.70, RARE: 0.20, EPIC: 0.09, LEGENDARY: 0.01 } as Record<Rarity, number>,
  },
  coin_big: {
    id: "coin_big",
    label: "Coin Pack (Big)",
    currency: "COIN" as const,
    cost: 300,
    count: 10,
    drops: { COMMON: 0.60, RARE: 0.25, EPIC: 0.12, LEGENDARY: 0.03 } as Record<Rarity, number>,
  },
  piece_elite: {
    id: "piece_elite",
    label: "Puzzle Piece Pack",
    currency: "PIECE" as const,
    cost: 5,
    count: 5,
    drops: { COMMON: 0.40, RARE: 0.30, EPIC: 0.20, LEGENDARY: 0.10 } as Record<Rarity, number>,
  },
} as const;

const CAT_FILES: Record<CardCategory, string> = {
  name: "names.json",
  animal: "animals.json",
  country: "countries.json",
  food: "foods.json",
  brand: "brands.json",
  screen: "screen.json",
};

/* ================= Utils ================= */
const hasLetters = (s: string) => /[a-z]/i.test(s);
const looksLikeGarbageId = (s: string) =>
  /^q\d+$/i.test(s) ||                  // q42864748
  /^[\W_]+$/.test(s) ||                 // only punctuation/underscores
  /https?:\/\//i.test(s) ||             // urls
  /[\\/@]/.test(s);                     // obvious separators

/** stricter pack-award filter */
function isAwardableWord(word: string, _cat: CardCategory): boolean {
  const t = word.trim();
  if (!t) return false;
  if (!hasLetters(t)) return false;
  if (looksLikeGarbageId(t)) return false;

  // Optional: keep very short tokens out (e.g., 1-char)
  if (t.replace(/\W/g, "").length < 2) return false;

  // You can add per-category rules here later if needed.
  return true;
}

/* ================= Word pool loader ================= */
let poolCache: Partial<Record<CardCategory, string[]>> = {};

function cleanWord(x: unknown): string | null {
  if (x == null) return null;
  const s =
    typeof x === "string"
      ? x
      : typeof x === "object"
      ? String((x as any)?.name ?? (x as any)?.title ?? (x as any)?.word ?? "")
      : String(x);
  const t = s.trim();
  return t.length ? t : null;
}

// Accept arrays of strings OR objects with {name|title|word}
async function getPool(cat: CardCategory): Promise<string[]> {
  if (poolCache[cat]) return poolCache[cat]!;
  const p = path.join(process.cwd(), "public", "wordchains", CAT_FILES[cat]);
  const raw = await fs.readFile(p, "utf8").catch(() => "[]");
  let arr: any = [];
  try {
    arr = JSON.parse(raw);
  } catch {
    arr = [];
  }
  const list = (Array.isArray(arr) ? arr : []).map(cleanWord).filter(Boolean) as string[];

  // de-dupe (case-insensitive), keep first occurrence
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const w of list) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(w);
    }
  }

  // final pack-award filter
  const filtered = deduped.filter((w) => isAwardableWord(w, cat));

  poolCache[cat] = filtered;
  return filtered;
}

/* ================= RNG helpers ================= */
function rollRarity(drops: Record<Rarity, number>, rng = Math.random): Rarity {
  const order: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
  const r = rng();
  let acc = 0;
  for (const k of order) {
    acc += drops[k] ?? 0;
    if (r <= acc) return k;
  }
  return "COMMON";
}
function pick<T>(arr: T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

async function rollCards(count: number, rng: () => number, drops: Record<Rarity, number>) {
  const cats = Object.keys(CAT_FILES) as CardCategory[];
  const out: { word: string; category: CardCategory; rarity: Rarity }[] = [];

  let safety = count * 20; // prevent infinite loops if pools are tiny
  while (out.length < count && safety-- > 0) {
    const cat = pick(cats, rng);
    const pool = await getPool(cat);
    if (!pool.length) continue;
    const candidate = pick(pool, rng);
    if (!isAwardableWord(candidate, cat)) continue;
    const rarity = rollRarity(drops, rng);
    out.push({ word: candidate, category: cat, rarity });
  }

  return out;
}

/* ================= Handler ================= */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ ok: false, error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const packId = body?.packId as keyof typeof PACKS | undefined;
  const pack = packId ? PACKS[packId] : undefined;
  if (!pack) return NextResponse.json({ ok: false, error: "invalid pack" }, { status: 400 });

  // RNG seed per request (deterministic per request)
  const seeded = (() => {
    let s = Number(crypto.randomBytes(8).readBigUInt64BE() % BigInt(2147483647));
    return () => (s = (s * 48271) % 2147483647) / 2147483647;
  })();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Compute available pieces at txn time
      const piecesEarned = await tx.dailyPiece.count({ where: { userId } });
      const spentAgg = await tx.packPurchase.aggregate({
        where: { userId },
        _sum: { piecesSpent: true },
      });
      const piecesSpent = spentAgg._sum.piecesSpent ?? 0;
      const piecesLeftStart = Math.max(0, piecesEarned - piecesSpent);

      // Ensure wallet exists
      let wallet = await tx.wordcoinWallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wordcoinWallet.create({ data: { userId, balance: 0 } });
      }

      // Charge currency
      let newBalance = wallet.balance;
      let newPiecesLeft = piecesLeftStart;

      if (pack.currency === "COIN") {
        if (wallet.balance < pack.cost) throw new Error("NOT_ENOUGH_COINS");
        await tx.wordcoinTxn.create({
          data: { userId, amount: -pack.cost, reason: { kind: "PACK", packId } },
        });
        const updated = await tx.wordcoinWallet.update({
          where: { userId },
          data: { balance: { decrement: pack.cost } },
          select: { balance: true },
        });
        newBalance = updated.balance;
      } else {
        if (piecesLeftStart < pack.cost) throw new Error("NOT_ENOUGH_PIECES");
        newPiecesLeft = piecesLeftStart - pack.cost;
      }

      // Roll & grant user-owned WordCards (IDs used later for Deck)
      const rolled = await rollCards(pack.count, seeded, pack.drops);

      // Final guard before insert (belt & suspenders)
      const safe = rolled.filter((c) => isAwardableWord(c.word, c.category));

      const created = await Promise.all(
        safe.map((c) =>
          tx.wordCard.create({
            data: {
              userId,
              word: c.word.trim(),
              category: c.category as any, // Prisma enum CardCategory
              rarity: c.rarity as any,     // Prisma enum CardRarity
            },
            select: { id: true, word: true, category: true, rarity: true },
          })
        )
      );

      await tx.packPurchase.create({
        data: {
          userId,
          packId: pack.id,
          coinsSpent: pack.currency === "COIN" ? pack.cost : 0,
          piecesSpent: pack.currency === "PIECE" ? pack.cost : 0,
          cardsGranted: created,
        },
      });

      return { created, balance: newBalance, piecesLeft: newPiecesLeft };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.message === "NOT_ENOUGH_COINS") {
      return NextResponse.json({ ok: false, error: "Not enough WordCoins" }, { status: 400 });
    }
    if (e?.message === "NOT_ENOUGH_PIECES") {
      return NextResponse.json({ ok: false, error: "Not enough Pieces" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
