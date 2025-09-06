import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Row = { id?: string; name: string; score: number; created_at?: string };
type Payload = { disabled?: boolean; rows?: Row[]; error?: string };

// Build an absolute URL for server-side fetches
function getBaseUrl() {
  // On Vercel, use the forwarded proto; locally it will be http
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  if (host) return `${proto}://${host}`;

  // Fallback for unusual environments
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

async function getData(): Promise<Payload> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/wordchains/leaderboard`, { cache: "no-store" });
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await getData();

  return (
    <div className="mx-auto max-w-2xl card space-y-4">
      <h1 className="text-2xl font-bold">World Leaderboard</h1>

      {data?.error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-800">
          Error: {data.error}
        </div>
      )}

      {data?.disabled ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Leaderboard is not configured.
          Set <code>POSTGRES_URL</code> in your environment to enable it.
        </div>
      ) : (
        <ol className="list-decimal list-inside space-y-2">
          {(data?.rows ?? []).length === 0 && (
            <div className="text-sm text-gray-500">No scores yet.</div>
          )}
          {(data?.rows ?? []).map((r, i) => (
            <li
              key={r.id ?? `${r.name}-${r.score}-${i}`}
              className="flex justify-between gap-4"
            >
              <span className="truncate max-w-[12rem]">{r.name || "anon"}</span>
              <span className="font-semibold">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
