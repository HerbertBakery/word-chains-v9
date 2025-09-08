import { NextResponse } from "next/server";
import { Pool } from "pg";

type Row = { id?: string; name: string; score: number; created_at?: string };
type Payload = { disabled?: boolean; rows?: Row[]; error?: string };

// Support either env name; DATABASE_URL preferred
const URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool: Pool | null = null;
if (URL) {
  pool = new Pool({
    connectionString: URL,
    ssl: { rejectUnauthorized: false },
  });
}

export async function GET() {
  try {
    if (!pool) {
      const payload: Payload = { disabled: true };
      return NextResponse.json(payload, { status: 200 });
    }

    // Ensure table exists (safe on repeat)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        score       INTEGER NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Detect whether schema uses "name" or old "username"
    const colRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'leaderboard'
        AND column_name IN ('name','username');
    `);
    const hasName = colRes.rows.some((r) => r.column_name === "name");
    const hasUsername = colRes.rows.some((r) => r.column_name === "username");
    const nameExpr = hasName ? "name" : hasUsername ? "username" : "name";

    const { rows } = await pool.query(`
      SELECT id, ${nameExpr} AS name, score, created_at
      FROM leaderboard
      ORDER BY score DESC
      LIMIT 50;
    `);

    const payload: Payload = { rows };
    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("LEADERBOARD_ERROR", {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      stack: err?.stack,
    });
    const payload: Payload = { error: "Failed to load leaderboard" };
    return NextResponse.json(payload, { status: 500 });
  }
}
