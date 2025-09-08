"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function GameTopBar() {
  const { data: session, status } = useSession();
  const user = session?.user as any;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white/80 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-semibold">Word Chains</Link>
        <Link href="/leaderboard" className="text-sm underline">Leaderboard</Link>
        <Link href="/stats" className="text-sm underline">Stats</Link>
      </div>

      {status === "loading" ? null : !user ? (
        <button
          onClick={() => signIn("google")}
          className="rounded bg-black text-white px-3 py-1.5 text-sm"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {user?.image ? (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-neutral-200" />
          )}
          <span className="text-sm">
            {user.username ?? user.name ?? (user.email?.split("@")[0] ?? "You")}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded border px-2 py-1 text-xs hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
