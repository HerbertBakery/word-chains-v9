// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AuthGate from "./components/AuthGate";

export default function Page() {
  return (
    <>
      <div className="grid items-center gap-12 md:grid-cols-2">
        {/* Left: logo + tagline + CTAs */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Image
              src="/wordchains-logo.png"
              alt="Word Chains logo"
              width={120}
              height={120}
              className="h-16 w-16 md:h-20 md:w-20 drop-shadow-xl"
              priority
            />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Chain words. Stack multipliers.
            </h1>
          </div>

          <p className="text-lg text-gray-700 dark:text-gray-300">
            Start with the last letter and include the first letter of the previous word.
            Build per-category multipliers and watch them add into one massive total multiplier.
          </p>

          {/* Buttons row + Sign in */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/word-chains" className="btn btn-primary">Play now</Link>
            <Link href="/leaderboard" className="btn btn-ghost">Leaderboard</Link>
            <Link href="/stats" className="btn btn-ghost">Stats</Link>
            <Link href="/rules" className="btn btn-ghost">Rules</Link>
            <AuthGate compact />
          </div>

          {/* Quick highlights */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border bg-white/70 p-4 backdrop-blur dark:bg-slate-800/60">
              <p className="font-semibold">Power-ups</p>
              <p className="text-gray-600 dark:text-gray-300">
                Freeze Time, Wild Surge, Nuke, Extra Life—earned by unique finds in each category.
              </p>
            </div>
            <div className="rounded-xl border bg-white/70 p-4 backdrop-blur dark:bg-slate-800/60">
              <p className="font-semibold">Missions</p>
              <p className="text-gray-600 dark:text-gray-300">
                Beat progressive tasks to unlock new categories and earn LINKS.
              </p>
            </div>
          </div>
        </div>

        {/* Right: feature card with soft glow */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-sky-200/40 via-emerald-200/40 to-amber-200/40 blur-2xl dark:from-sky-900/40 dark:via-emerald-900/40 dark:to-amber-900/40" />
          <div className="rounded-3xl border bg-white/80 p-6 shadow-xl backdrop-blur-lg dark:bg-slate-900/70">
            <Image
              src="/wordchains-logo.png"
              alt=""
              width={480}
              height={480}
              className="mx-auto mb-6 h-auto w-48 md:w-56"
            />
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <li><b>Chains:</b> Names, Animals, Countries, plus unlockables (Food, Brands, TV & Movies…)</li>
              <li><b>LINKS:</b> Preserve multipliers when switching categories.</li>
              <li><b>Missions:</b> Progressive challenges that earn LINKS and reveal new categories.</li>
              <li>
                <b>Records:</b> Lifetime stats: Highest Score, Longest Chain, Highest Multiplier, Best Single-Word,
                Longest Word, and category streaks.
              </li>
              <li><b>Leaderboards:</b> Dynamic across different metrics — <i>where do you rank?</i></li>
            </ul>

            <div className="mt-6 flex justify-center">
              <Link href="/rules" className="btn btn-outline">How scoring works →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
