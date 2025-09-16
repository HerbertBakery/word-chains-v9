// app/api/_lib/daily.ts
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const DEVICE_COOKIE = "wc_device_id";

/**
 * Ensure an anonymous device id cookie exists and return its value.
 * Used to track daily runs for guests (not signed in).
 */
export function ensureDeviceIdCookie(): string {
  const jar = cookies();
  let id = jar.get(DEVICE_COOKIE)?.value;

  if (!id) {
    id = randomUUID();
    jar.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    });
  }

  return id;
}
