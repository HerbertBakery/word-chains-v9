// app/api/daily/hidden-words/route.ts
import { NextResponse } from "next/server";
import { generateDailyHiddenWords } from "@/lib/dailyHiddenWords";

export async function GET() {
  try {
    const data = await generateDailyHiddenWords();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "failed_to_generate" }, { status: 500 });
  }
}
