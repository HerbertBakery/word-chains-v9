// app/api/packs/seed/route.ts
import { NextResponse } from "next/server";

// This endpoint used to upsert PackType records,
// but there is no PackType model in prisma schema.
// Make it a no-op to unblock builds/deploys.
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Seed skipped: no PackType model in schema.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Seed endpoint is a no-op (no PackType model).",
  });
}
