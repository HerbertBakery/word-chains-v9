// app/rules/page.tsx
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Rules & Scoring — Word Chains",
};

function Section({
  id,
  title,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      id={id}
      className="group rounded-2xl border bg-white/80 p-0 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-0 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </details>
  );
}

export default function RulesPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-amber-50 to-sky-50 py-10 dark:from-zinc-900 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/wordchains-logo.png"
              alt="Word Chains logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl shadow"
              priority
            />
            <h1 className="text-3xl font-bold md:text-4xl">Rules & Scoring</h1>
          </div>
          <Link href="/" className="btn btn-ghost">← Home</Link>
        </div>

        {/* Layout */}
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Quick Menu */}
          <aside className="lg:col-span-1">
            <nav className="sticky top-6 rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quick menu
              </p>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-to-play" className="hover:underline">How to Play</a></li>
                <li><a href="#word-validity" className="hover:underline">Word Validity</a></li>
                <li><a href="#missions" className="hover:underline">Missions & Unlocks</a></li>
                <li><a href="#powerups" className="hover:underline">Power-Ups (All Details)</a></li>
                <li><a href="#scoring" className="hover:underline">Scoring Overview</a></li>
                <li><a href="#penalties" className="hover:underline">Penalties</a></li>
                <li><a href="#leaderboards" className="hover:underline">Leaderboards</a></li>
                <li><a href="#records" className="hover:underline">Records & Lifetime Stats</a></li>
                <li><a href="#tips" className="hover:underline">Tips</a></li>
              </ul>
            </nav>
          </aside>

          {/* Sections */}
          <section className="space-y-4 lg:col-span-3">
            <Section id="how-to-play" title="How to Play" defaultOpen>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Pick a category (Names, Animals, Countries; unlockables include Foods, Brands, TV & Movies).</li>
                <li>
                  Your next word must <b>start with the last letter</b> of the previous word and also
                  <b> include the first letter</b> of that previous word somewhere in it.
                </li>
                <li>Keep chaining valid words to build streaks and per-category multipliers.</li>
                <li>Switch categories anytime—<b>LINKS</b> preserve multipliers when you switch.</li>
              </ol>
            </Section>

            <Section id="word-validity" title="Word Validity">
              <ul className="list-disc space-y-2 pl-5">
                <li>Must fit the selected category; standard spelling required.</li>
                <li>No repeats within the same run.</li>
                <li>
                  <b>Same letters bonus:</b> a word that <u>starts and ends with the same letter</u> earns a bonus
                  (e.g., <i>Alaska</i>, <i>Ibiza</i>).
                </li>
                <li>Some categories allow plural/singular; follow in-game prompts.</li>
              </ul>
            </Section>

            <Section id="missions" title="Missions & Unlocks">
  <p className="mb-2">
    Each category has a progressive mission chain. Complete the current mission to unlock the next tier
    (and sometimes new categories). Missions award <b>LINKS</b>, and each <b>completed section adds +10</b>
    to your <b>total multiplier base</b> for the current run. This is <u>additive</u> — it does not multiply the base.
  </p>
  <ul className="list-disc space-y-2 pl-5">
    <li>Missions appear as you progress—finish one to reveal the next.</li>
    <li>Completed sections stack: finish 2 sections → base +20; finish 3 → base +30, etc.</li>
    <li>The mission bonus applies for the current run and resets when the run ends.</li>
  </ul>
</Section>


            <Section id="powerups" title="Power-Ups (All Details)">
  <p className="mb-3">
    Power-ups are earned by collecting <b>unique</b> words in specific categories. Charges are per run.
  </p>

  <ul className="space-y-4">
    <li>
      <p className="font-semibold">🇨🇦 Countries → <b>Nuke</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>10 unique countries</b>.</li>
        <li><b>Effect:</b> Clears reuse limits — you may reuse any previously played word this run.</li>
        <li><b>Duration:</b> Instant effect; persists for the rest of the run.</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">👤 Names → <b>ChatGPT</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>10 unique names</b>.</li>
        <li>
          <b>Effect:</b> Instantly plays a <i>random valid word</i> that <i>fits your current chain</i>.<br/>
          If the last accepted word was a category word, Research picks from that same category; otherwise it plays any valid word.
        </li>
        <li><b>Notes:</b> The auto-played word <u>does not grant unique-word credit</u> (it won’t charge any power-up). If nothing valid is found, the charge is still consumed.</li>
        <li><b>Duration:</b> One word (instant).</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">🐾 Animals → <b>Wild Surge</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>10 unique animals</b>.</li>
        <li><b>Effect:</b> Temporary <b>+20×</b> additive boost to your total multiplier.</li>
        <li><b>Ends when</b> you lose your multiplier (e.g., invalid answer / timeout / category reset).</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">🍎 Foods → <b>Extra Life</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>5 unique foods</b>.</li>
        <li><b>Effect:</b> Gain <b>+1 life</b> (max health <b>5</b>).</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">💼 Brands → <b>Sponsor Boost</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>5 unique brands</b>.</li>
        <li><b>Effect:</b> <b>+50×</b> additive bonus on your <b>next</b> valid word only.</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">🎬 TV/Movies → <b>Montage</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Collect <b>10 unique TV/Movie entries</b>.</li>
        <li><b>Effect:</b> <b>Full freeze</b> — the timer is paused <b>until your next valid submission</b> (not timed).</li>
        <li><b>Ends when</b> you enter a valid word (or the run ends).</li>
      </ul>
    </li>

    <li>
      <p className="font-semibold">🔁 Same-Letter → <b>Mirror Charm</b></p>
      <ul className="list-disc pl-5">
        <li><b>Activation:</b> Play <b>10 unique</b> same-letter words (start and end with the same letter).</li>
        <li><b>Effect:</b> <b>+10×</b> additive bonus on your <b>next</b> valid word only.</li>
      </ul>
    </li>
  </ul>
</Section>


            <Section id="scoring" title="Scoring Overview">
              <p className="mb-2 italic">Exact values follow the live constants; this summarizes where points come from.</p>
              <ul className="list-disc space-y-2 pl-5">
  <li><b>Base points</b> per valid word.</li>
  <li><b>Length / difficulty bonuses</b> (longer/rarer words score higher).</li>
  <li><b>Same letters bonus</b> (starts & ends with same letter).</li>
  <li><b>Speed bonus</b> for quick answers.</li>
  <li><b>Streak bonuses</b> at milestone chain lengths.</li>
  <li><b>Category multipliers</b> grow with unique finds in that category.</li>
  <li><b>Mission bonus (additive):</b> each completed section adds <b>+10</b> to the total multiplier <b>base</b>.</li>
  <li><b>Total multiplier</b> = (<i>sum of category multipliers</i> + <i>10 × completed sections</i>) × <i>same-letter</i>.</li>
</ul>

            </Section>

            <Section id="penalties" title="Penalties">
              <ul className="list-disc space-y-2 pl-5">
                <li>Invalid or off-category words.</li>
                <li>Repeating a word within the current run.</li>
                <li>Timer expiry (ends the run).</li>
              </ul>
            </Section>

            <Section id="leaderboards" title="Leaderboards">
              <p className="mb-2">
                Word Chains features <b>dynamic, global leaderboards</b> across multiple metrics. Use the dropdown on the
                Leaderboard page to switch what’s being ranked, and the time window (e.g., All-time, Weekly).
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li><b>Highest Score</b> (single run)</li>
                <li><b>Longest Chain</b></li>
                <li><b>Highest Multiplier</b></li>
                <li><b>Best Single-Word Score</b></li>
                <li><b>Fastest Average Response</b> (optional)</li>
                <li><b>Most Unique Words</b> (lifetime)</li>
              </ul>
              <p className="mt-2">Where do you rank in the world? Check <Link href="/leaderboard" className="link">the Leaderboard</Link>.</p>
            </Section>

            <Section id="records" title="Records & Lifetime Stats">
              <ul className="list-disc space-y-2 pl-5">
                <li>Highest Score, Longest Chain, Highest Multiplier.</li>
                <li>Best Single-Word Score, Longest Word.</li>
                <li>Category streaks (e.g., Longest Animal streak), sessions played, unique words found.</li>
              </ul>
            </Section>

            <Section id="tips" title="Tips">
              <ul className="list-disc space-y-2 pl-5">
                <li>Use <b>LINKS</b> to swap categories safely while retaining multipliers.</li>
                <li>Target power-ups early to amplify your total multiplier mid-run.</li>
                <li>End on letters that give you more options next turn.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/word-chains" className="btn btn-primary">Play now</Link>
                <Link href="/leaderboard" className="btn btn-ghost">Leaderboard</Link>
                <Link href="/stats" className="btn btn-ghost">Stats</Link>
              </div>
            </Section>
          </section>
        </div>
      </div>
    </main>
  );
}
