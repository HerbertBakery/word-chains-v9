"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RankedJoin({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const join = async () => {
      const res = await fetch(`/api/ranked/${params.id}`, { method: "PATCH" });
      if (res.status === 401) {
        const cb = encodeURIComponent(window.location.href);
        window.location.href = `/api/auth/signin?callbackUrl=${cb}`;
        return;
      }
      const info = await fetch(`/api/ranked/${params.id}`);
      const data = await info.json();
      if (!info.ok) {
        setErr(data?.error || "Unable to load match");
        return;
      }
      router.replace(`/play/chain?seed=${data.seed}&match=${data.id}`);
    };
    join();
  }, [params.id, router]);

  if (err) return <div className="p-6 text-red-500">{err}</div>;
  return <div className="p-6">Joining match…</div>;
}
