"use client";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

function normalize(raw: string) {
  return (raw || "").trim().toLowerCase();
}

// Friendlier + slightly less rigid: allow letters, numbers, ".", "_",
// disallow leading/trailing dot/underscore and consecutive dot/underscore. 3–20 chars.
function validate(u: string): { ok: true } | { ok: false; reason: string } {
  const s = normalize(u);
  if (s.length < 3 || s.length > 20) return { ok: false, reason: "Use 3–20 characters." };
  if (!/^[a-z0-9._]+$/.test(s)) return { ok: false, reason: "Only a–z, 0–9, dot (.) and underscore (_)." };
  if (/^[._]/.test(s) || /[._]$/.test(s)) return { ok: false, reason: "Can't start or end with \".\" or \"_\"." };
  if (/[._]{2,}/.test(s)) return { ok: false, reason: "No consecutive dots/underscores like \"..\" or \"__\"." };
  if (s.startsWith("anon_")) return { ok: false, reason: "Please choose a custom name (not starting with anon_)." };
  return { ok: true };
}

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

  // live validation
  React.useEffect(() => {
    const s = normalize(raw);
    const v = validate(s);
    setHint(v.ok ? null : v.reason);
  }, [raw]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const username = normalize(raw);

    const v = validate(username);
    if (!v.ok) {
      setSaving(false);
      setError(v.reason);
      return;
    }

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

      {/* noValidate prevents the browser’s vague pattern error */}
      <form onSubmit={submit} noValidate className="space-y-3">
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value.toLowerCase())}
          placeholder="e.g. herbert.saurus"
          maxLength={20}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          aria-describedby="username-rules"
          required
        />
        <p id="username-rules" className="text-xs text-neutral-500">
          Use 3–20 chars. a–z, 0–9, “.” and “_”. No starting/ending with “.” or “_”, and no “..” or “__”.
        </p>

        {hint && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs">{hint}</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}

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

export function getClientUserId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "wc_uid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    const rand = Math.random().toString(36).slice(2, 10);
    id = `anon_${rand}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
