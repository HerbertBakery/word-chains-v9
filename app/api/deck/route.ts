// app/api/deck/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SLOT_COUNT = 3;

const ok = (json: any, init: number | ResponseInit = 200) =>
  NextResponse.json(json, typeof init === "number" ? { status: init } : init);
const bad = (msg: string, code = 400) => ok({ ok: false, error: msg }, code);

async function ensureSlots(userId: string) {
  for (let i = 0; i < SLOT_COUNT; i++) {
    await prisma.deckSlot.upsert({
      where: { userId_slotIndex: { userId, slotIndex: i } },
      create: { userId, slotIndex: i, cardId: null },
      update: {},
    });
  }
}

async function fetchDeck(userId: string) {
  const slots = await prisma.deckSlot.findMany({
    where: { userId },
    orderBy: { slotIndex: "asc" },
    include: {
      card: { select: { id: true, word: true, category: true, rarity: true, createdAt: true } },
    },
  });
  const deck = slots.map((s) =>
    s.card
      ? { slot: s.slotIndex, id: s.card.id, word: s.card.word, category: s.card.category, rarity: s.card.rarity }
      : null
  );
  return { slots, deck };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return bad("auth required", 401);

  await ensureSlots(userId);
  const data = await fetchDeck(userId);
  return ok({ ok: true, ...data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return bad("auth required", 401);

  await ensureSlots(userId);

  const url = new URL(req.url);
  const query = url.searchParams;

  // 1) Read body robustly (JSON, form-data, urlencoded, or empty)
  const contentType = req.headers.get("content-type") || "";
  let body: any = {};
  try {
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      // Try JSON; fall back to urlencoded; if empty, leave {}
      try {
        body = await req.json();
      } catch {
        const text = await req.text();
        if (text) body = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch {
    body = {};
  }

  // Merge any query params (helps if client posts with no body)
  for (const [k, v] of query.entries()) {
    if (!(k in body)) body[k] = v;
  }

  // 2) Some clients embed JSON strings for arrays/objects; try parse them
  const tryParse = (v: any) => {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return v; }
  };
  body = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, tryParse(v)]));

  const toNull = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") {
      const s = v.trim();
      if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
      return s;
    }
    return String(v);
  };

  // 3) Build updates from MANY accepted shapes
  const updates: Array<{ slot: number; cardId: string | null }> = [];

  // single: { slot, cardId }
  if (Number.isInteger(Number(body?.slot))) {
    const slot = Number(body.slot);
    if (slot >= 0 && slot < SLOT_COUNT) updates.push({ slot, cardId: toNull(body.cardId) });
  }

  // bulk: { slots: [{ slot, cardId }, ...] }
  if (Array.isArray(body?.slots)) {
    for (const entry of body.slots) {
      const slot = Number(entry?.slot);
      if (Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT) {
        updates.push({ slot, cardId: toNull(entry?.cardId) });
      }
    }
  }

  // bulk: { deck: [cardId|null, ...] }
  if (Array.isArray(body?.deck)) {
    for (let i = 0; i < Math.min(SLOT_COUNT, body.deck.length); i++) {
      updates.push({ slot: i, cardId: toNull(body.deck[i]) });
    }
  }

  // keys: { s0, s1, s2 }
  if ("s0" in body || "s1" in body || "s2" in body) {
    for (let i = 0; i < SLOT_COUNT; i++) updates.push({ slot: i, cardId: toNull((body as any)[`s${i}`]) });
  }

  // keys: { slot0, slot1, slot2 }
  if ("slot0" in body || "slot1" in body || "slot2" in body) {
    for (let i = 0; i < SLOT_COUNT; i++) updates.push({ slot: i, cardId: toNull((body as any)[`slot${i}`]) });
  }

  // keys: { card0, card1, card2 }
  if ("card0" in body || "card1" in body || "card2" in body) {
    for (let i = 0; i < SLOT_COUNT; i++) updates.push({ slot: i, cardId: toNull((body as any)[`card${i}`]) });
  }

  // numeric keys: { "0": id, "1": id, "2": id }
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (String(i) in body) updates.push({ slot: i, cardId: toNull((body as any)[String(i)]) });
  }

  // cards array: { cards: [{ id, slot }, ...] } or { cards: [id0, id1, id2] }
  if (Array.isArray(body?.cards)) {
    const arr = body.cards as any[];
    // [{id,slot}]
    if (arr.length && typeof arr[0] === "object" && "slot" in arr[0]) {
      for (const c of arr) {
        const slot = Number(c?.slot);
        if (Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT) {
          updates.push({ slot, cardId: toNull(c?.id) });
        }
      }
    } else {
      // [id0, id1, id2]
      for (let i = 0; i < Math.min(SLOT_COUNT, arr.length); i++) {
        updates.push({ slot: i, cardId: toNull(arr[i]) });
      }
    }
  }

  // 4) If still nothing, bail
  if (updates.length === 0) {
    return bad(
      "expected payload like { slot, cardId } or { slots:[...] } or { deck:[...] } or { s0,s1,s2 } " +
      "or numeric keys '0','1','2' or { cards:[...] } (JSON/FormData/URL-encoded or query)"
    );
  }

  // 5) Validate ownership for non-null cardIds
  const idsToCheck = Array.from(new Set(updates.map(u => u.cardId).filter(Boolean) as string[]));
  if (idsToCheck.length) {
    const owned = await prisma.wordCard.findMany({
      where: { userId, id: { in: idsToCheck } },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map(o => o.id));
    for (const id of idsToCheck) {
      if (!ownedSet.has(id)) return bad("card not found or not owned");
    }
  }

  // 6) Apply
  await Promise.all(
    updates.map(({ slot, cardId }) =>
      prisma.deckSlot.upsert({
        where: { userId_slotIndex: { userId, slotIndex: slot } },
        create: { userId, slotIndex: slot, cardId },
        update: { cardId },
      })
    )
  );

  const data = await fetchDeck(userId);
  return ok({ ok: true, ...data });
}
