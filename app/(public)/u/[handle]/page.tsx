import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";

async function getData(handle: string) {
  const user = await prisma.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" } },
    select: { id: true, username: true, name: true, image: true },
  });
  if (!user) return null;
  const stats = await (prisma as any).playerStats.findUnique({ where: { userId: user.id } });
  return { user, stats };
}

export default async function UserProfile({ params }: { params: { handle: string } }) {
  const data = await getData(params.handle);
  if (!data) return notFound();
  const { user, stats } = data;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-neutral-200 overflow-hidden">
          {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-2xl font-bold">@{user.username}</div>
          {user.name && <div className="text-sm text-neutral-500">{user.name}</div>}
        </div>
      </div>

      {!stats ? (
        <div className="rounded-2xl border bg-white/70 p-5 text-neutral-600">
          No stats yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label="Best Score" value={stats.bestScore} />
          <Card label="Longest Chain" value={stats.longestChain} />
          <Card label="Highest Multiplier" value={stats.highestMultiplier} />
          <Card label="Total Words" value={stats.totalWords} />
          <Card label="Unique Words" value={stats.uniqueWords} />
          <Card label="Animals" value={stats.animals} />
          <Card label="Countries" value={stats.countries} />
          <Card label="Names" value={stats.names} />
          <Card label="Badges" value={stats.badges} />
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-xl font-semibold">{value ?? 0}</div>
    </div>
  );
}
