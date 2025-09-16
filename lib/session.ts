// lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Always decode the session with the same authOptions your NextAuth route uses. */
export async function safeGetServerSession() {
  // @ts-ignore - next-auth types vary; this works in App Router
  return getServerSession(authOptions);
}
