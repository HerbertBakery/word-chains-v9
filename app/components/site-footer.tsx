// app/components/site-footer.tsx
import Link from "next/link";

export default function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={[
        "mt-10 md:mt-16 border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40",
        "dark:bg-neutral-900/60 dark:border-neutral-800",
        className,
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-neutral-600 dark:text-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">Word Chains</span>
          <span className="hidden sm:inline text-neutral-400">•</span>
          <span className="text-neutral-500">© {new Date().getFullYear()}</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <a href="mailto:huxardedu@gmail.com" className="hover:underline">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
