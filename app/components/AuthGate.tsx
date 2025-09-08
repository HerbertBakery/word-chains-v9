"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthGate({ compact = false }: { compact?: boolean }) {
  const { data, status } = useSession();
  const user = data?.user as any;

  if (status === "loading") return null;

  if (!user) {
    return (
      <button
        onClick={() => signIn("google")}
        className={compact ? "text-sm underline" : "rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90"}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.image ? <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-neutral-200" />}
      <span className="text-sm font-medium">{user.username ?? user.name ?? user.email?.split("@")[0] ?? "You"}</span>
      {!user.username && (
        <a href="/onboarding" className="text-xs rounded-lg border px-2 py-1 hover:bg-neutral-50">set username</a>
      )}
      <button onClick={() => signOut()} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">Sign out</button>
    </div>
  );
}
