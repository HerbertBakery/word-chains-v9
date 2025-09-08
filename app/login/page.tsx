"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginPage() {
  const { data, status } = useSession();
  const user = data?.user as any;

  return (
    <div className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {status === "loading" && <div className="text-neutral-500 text-sm">Loading…</div>}
      {!user && status !== "loading" && (
        <button
          onClick={() => signIn("google")}
          className="w-full rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Continue with Google
        </button>
      )}
      {user && (
        <>
          <div className="text-sm">Signed in as <b>{user.username ?? user.name ?? user.email}</b></div>
          <a href="/onboarding" className="text-sm underline">Set username</a>
          <button onClick={() => signOut()} className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
