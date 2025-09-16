// lib/dailySpec.ts
import { createHash } from "crypto";
import { getTodayKey, toDailyKey, DAILY_TZ } from "@/lib/dailyKey";

/** Local types (avoid import cycles) */
type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";

type DailyGoal =
  | { kind: "score"; target: number }
  | { kind: "category"; cat: ChainKey; count: number }
  | { kind: "trick"; trick: "sameEnds" | "chain"; count: number };

type DailySpec = {
  id: string;           // e.g. "2025-09-15"
  specId: string;       // equal to id for now
  dateKey: string;      // same as id
  timeSeconds: number;  // per-day time
  starter: string;      // starter display word
  goals: DailyGoal[];   // score + 4 categories + 1 trick
  signature: string;    // sha256 of canonical payload + salt
};

/** PRNG + helpers */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function shuffle<T>(rng: () => number, a: T[]) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build the daily spec */
export async function getTodaySpec(inputDate?: Date): Promise<{
  dateKey: string;
  specId: string;
  spec: DailySpec;
}> {
  const dateKey = inputDate ? toDailyKey(inputDate, DAILY_TZ) : getTodayKey();
  const rng = mulberry32(strHash(dateKey));

  // Starters (UI flavor only)
  const starters = [
    "orbit","silk","ember","quartz","pixel","harbor","magnet","prism","velvet",
    "anchor","thunder","prayer","nectar","rocket","dynamo","riddle","violet","hazel","juniper",
  ];
  const starter = pick(rng, starters);

  /** ===== Category choice (sanitized; no empties/dups) ===== */
  const VALID_CATS: ChainKey[] = ["name","animal","country","food","brand","screen"];
  const isValidCat = (c: any): c is ChainKey => VALID_CATS.includes(c);

  // Bias away from "brand" while still allowing it
  const biasPool: ChainKey[] = [
    "name","animal","country","food","screen",
    "name","animal","country","food","screen",
    "brand",
  ];
  const shuffled = shuffle(rng, biasPool);

  const chosenCats: ChainKey[] = [];
  for (const c of shuffled) {
    if (isValidCat(c) && !chosenCats.includes(c)) chosenCats.push(c);
    if (chosenCats.length === 4) break;
  }
  for (const c of VALID_CATS) {
    if (chosenCats.length === 4) break;
    if (!chosenCats.includes(c)) chosenCats.push(c);
  }

  /** ===== Rhythm & targets ===== */
  const dow = new Date(dateKey + "T00:00:00").getDay(); // 0..6 (Sun..Sat)

  // Category counts baseline (gentle) + tiny ramp by index
  const baseCount = [3,4,4,5,5,6,6][dow];

  // >>> Raised: score targets are now ALL >= 20,000 <<<
  // (helpers can add ~15k total, so this keeps the goal meaningful)
  const scoreTargets = [20000, 21000, 22000, 23000, 24000, 26000, 28000];

  /** ===== Goals: score + 4 categories + 1 trick ===== */
  const categoryGoals: DailyGoal[] = chosenCats.slice(0, 4).map((cat, i) => {
    let count = baseCount + Math.max(0, i - 1); // tiny ramp across the four
    if (cat === "brand") count = Math.max(2, baseCount - 1); // brands are harder; soften
    return { kind: "category", cat, count };
  });

  // One trick: same-ends or chain length
  const trickGoal: DailyGoal =
    rng() < 0.5
      ? { kind: "trick", trick: "sameEnds", count: Math.min(6, 2 + Math.floor(rng() * 4)) } // 2–6
      : { kind: "trick", trick: "chain",    count: [6,7,8,9,10,12,14][dow] };

  // Slight time variance by day
  const timeSeconds = [120, 120, 120, 130, 140, 150, 150][dow];

  const goals: DailyGoal[] = [
    { kind: "score", target: scoreTargets[dow] },
    ...categoryGoals,
    trickGoal,
  ];

  /** ===== Final spec + signature ===== */
  const specBare = {
    id: dateKey,
    specId: dateKey,
    dateKey,
    timeSeconds,
    starter,
    goals,
  };

  const salt = process.env.DAILY_SPEC_SALT ?? "wc.v3";
  const canonical = JSON.stringify(specBare);
  const signature = createHash("sha256").update(salt).update(canonical).digest("hex");

  const spec: DailySpec = { ...specBare, signature };
  return { dateKey, specId: specBare.specId, spec };
}

export async function verifyTodaySpec(sig: string, inputDate?: Date): Promise<boolean> {
  const { spec } = await getTodaySpec(inputDate);
  return spec.signature === sig;
}
