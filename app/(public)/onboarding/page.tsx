"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { normalizeUsername, validateUsername, USERNAME_MIN, USERNAME_MAX } from "@/lib/username";

export default function OnboardingPage() {
  const { data, status } = useSession();
  const user = data?.user as any;
  const router = useRouter();

  const [raw, setRaw] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "loading") return;
    if (!user) router.push("/login");
    if (user?.username) router.push("/leaderboard");
  }, [status, user, router]);

  // live validation as user types
  React.useEffect(() => {
    const v = validateUsername(raw);
    setHint(v.ok ? null : v.reason);
  }, [raw]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const v = validateUsername(raw);
    if (!v.ok) {
      setSaving(false);
      setError(v.reason);
      return;
    }
    const username = normalizeUsername(raw);

    try {
      const res = await fetch("/api/user/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      router.push("/leaderboard");
    } catch (err: any) {
      setError(err.message || "Failed to save username.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-3">Choose your username</h1>
      <p className="text-sm text-neutral-500 mb-4">
        This will appear on the global leaderboard and your public profile.
      </p>

      {/* noValidate = avoid the browser's vague "match the requested format" popup */}
      <form onSubmit={submit} noValidate className="space-y-3">
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value.toLowerCase())}
          placeholder="e.g. herbert.saurus"
          maxLength={USERNAME_MAX}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          aria-describedby="username-rules"
          required
        />
        <p id="username-rules" className="text-xs text-neutral-500">
          Use {USERNAME_MIN}–{USERNAME_MAX} chars. a–z, 0–9, “.” and “_”. No starting/ending with “.” or “_”, and no “..” or “__”.
        </p>

        {hint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs">
            {hint}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || Boolean(hint)}
          className="rounded-xl bg-black text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save username"}
        </button>
      </form>
    </div>
  );
}
