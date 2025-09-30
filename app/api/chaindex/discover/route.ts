import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DexCat = "animal" | "country" | "screen" | "brand" | "food" | "name";

function stripDiacritics(s: string) {
  try { return s.normalize("NFD").replace(/\p{Diacritic}/gu, ""); } catch { return s; }
}
function normKey(s: string) { return stripDiacritics(String(s)).toLowerCase().trim(); }
function singularize(w: string) {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es"))  return w.slice(0, -2);
  if (w.endsWith("s"))   return w.slice(0, -1);
  return w;
}
function stripCorpSuffixes(s: string) {
  return s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();
}
function canonicalKey(category: DexCat, word: string) {
  const k = normKey(word);
  switch (category) {
    case "animal":
    case "food":   return singularize(k);
    case "brand":  return normKey(stripCorpSuffixes(word));
    default:       return k;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { category, key } = await req.json();
  const cat = String(category || "").toLowerCase() as DexCat;
  const canonical = canonicalKey(cat, String(key || ""));
  if (!["animal","country","screen","brand","food","name"].includes(cat) || !canonical) {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  await prisma.dexDiscovery.upsert({
    where: { userId_category_key_discovery: { userId, category: cat, key: canonical } },
    update: {},
    create: { userId, category: cat, key: canonical },
  });

  return NextResponse.json({ ok: true });
}
