"use client";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { data, status } = useSession();
  const user = data?.user as any;
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "loading") return;
    if (!user) router.push("/login");
    if (user?.username) router.push("/leaderboard");
  }, [status, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
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
      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. word_wizard"
          minLength={3}
          maxLength={20}
          pattern="^[a-z0-9_]{3,20}$"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          required
        />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-black text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save username"}
        </button>
      </form>
    </div>
  );
}
