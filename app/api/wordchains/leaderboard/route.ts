import { NextResponse } from "next/server";

// Accept either POSTGRES_URL (our default) or DATABASE_URL (Neon default)
function getEffectivePgUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

async function getSql() {
  const pgUrl = getEffectivePgUrl();
  if (!pgUrl) return null;

  // Ensure @vercel/postgres reads POSTGRES_URL
  if (!process.env.POSTGRES_URL) process.env.POSTGRES_URL = pgUrl;

  const mod = await import("@vercel/postgres");
  return mod.sql;
}

// One-time initializer guarded by both a module-scoped promise and an advisory lock
let initPromise: Promise<void> | null = null;

async function ensureInit(sql: any) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Take an advisory lock to serialize concurrent inits across requests
    // Use a constant lock key unique to this table
    const LOCK_KEY = 89432751; // any 32-bit int
    try {
      await sql`SELECT pg_advisory_lock(${LOCK_KEY});`;
      // Still use IF NOT EXISTS (idempotent) while locked
      await sql`
        CREATE TABLE IF NOT EXISTS wordchains_scores (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          score INT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
    } finally {
      await sql`SELECT pg_advisory_unlock(${LOCK_KEY});`;
    }
  })();

  try {
    await initPromise;
  } catch (e) {
    // If init failed, allow retry on next request
    initPromise = null;
    throw e;
  }
}

export async function GET() {
  try {
    const sql = await getSql();
    if (!sql) return NextResponse.json({ disabled: true, rows: [] });

    await ensureInit(sql);

    const { rows } = await sql`
      SELECT id, name, score, created_at
      FROM wordchains_scores
      ORDER BY score DESC NULLS LAST, created_at DESC
      LIMIT 50;
    `;
    return NextResponse.json({ disabled: false, rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score } = await req.json();
    if (typeof score !== "number" || Number.isNaN(score)) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    const player = String(name || "Anonymous").slice(0, 40);

    const sql = await getSql();
    if (!sql) return NextResponse.json({ disabled: true, ok: true });

    await ensureInit(sql);

    await sql`
      INSERT INTO wordchains_scores (name, score)
      VALUES (${player}, ${score});
    `;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
