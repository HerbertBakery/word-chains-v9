// app/components/PageShell.tsx
export default function PageShell({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <main className={`min-h-[100dvh] bg-gradient-to-br from-amber-50 to-sky-50 dark:from-zinc-900 dark:to-slate-900 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">{children}</div>
    </main>
  );
}
