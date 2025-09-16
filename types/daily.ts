// types/daily.ts

/** Keep this in sync with your main game's ChainKey union */
export type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";

export type DailyTrick = "sameEnds" | "chain";

/** A single daily goal definition */
export type DailyGoal =
  | { kind: "score"; target: number }                              // e.g., Score ≥ 12,000
  | { kind: "category"; cat: ChainKey; count: number }             // e.g., Animals ≥ 4
  | { kind: "trick"; trick: DailyTrick; count: number }            // e.g., sameEnds ≥ 3, chain ≥ 8
  | { kind: "letters"; letters: Array<{ letter: string; count: number }> }; // e.g., N ≥ 6, P ≥ 5

/** The server-issued daily spec */
export type DailySpec = {
  /** Canonical ID (UTC date) e.g. "2025-09-15" */
  id: string;
  /** Starter word for the run */
  starter: string;
  /** Goals: Score + 3–4 categories + (letters OR trick)  */
  goals: DailyGoal[];
  /** Seconds on the clock (e.g., 120–150) */
  timeSeconds: number;
  /** HMAC for anti-tamper (server-side secret) */
  signature: string;
};

export type DailySpecCore = Omit<DailySpec, "signature">;

/** Minimal payload for daily submit */
export type DailySubmitPayload = {
  id: string;                    // must match today's spec.id
  score: number;
  wordsPlayed: string[];         // ordered list
  catsCount: Record<ChainKey, number>;
  sameEnds: number;
  maxChain: number;

  /** Server-issued nonce from /api/daily/today (optional) */
  startedAt?: number;

  /** Client echoes the spec signature to allow quick reject if spec changed locally */
  specSig: string;

  /** Whether all goals were completed on the client side */
  completedAll?: boolean;
};

export type DailySubmitResult = {
  ok: boolean;
  fullClear: boolean;            // met all goals
  alreadyPlayed?: boolean;
  bestForDay?: number;
  streak?: { current: number; best?: number; todayPlayed?: boolean };
  message?: string;
};
