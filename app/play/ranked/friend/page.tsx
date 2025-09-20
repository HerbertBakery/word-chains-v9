"use client";
import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function RankedFriend() {
  const { data: session } = useSession();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session?.user) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Play a Friend</h1>
        <p className="mb-4">Sign in to create a duel link.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => signIn()}>
          Sign in
        </button>
      </div>
    );
  }

  const createMatch = async () => {
    setBusy(true);
    const res = await fetch("/api/ranked/create", { method: "POST" });
    const data = await res.json();
    setShareUrl(data.shareUrl);
    setBusy(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Play a Friend</h1>
      <p>Same seed for both players. Longest chain wins (score breaks ties).</p>

      {!shareUrl ? (
        <button disabled={busy} className="bg-green-600 text-white px-4 py-2 rounded" onClick={createMatch}>
          {busy ? "Creating…" : "Create Duel Link"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-neutral-800 rounded text-white">
            Share this link: <a className="underline" href={shareUrl}>{shareUrl}</a>
          </div>
          <a className="inline-block bg-blue-600 text-white px-4 py-2 rounded" href={shareUrl}>
            Play now
          </a>
        </div>
      )}
    </div>
  );
}
