import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy — Word Chains",
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

export default function PrivacyPage() {
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
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">Privacy Policy</h1>
              <p className="text-xs text-gray-500">Effective date: September 8, 2025</p>
            </div>
          </div>
          <Link href="/" className="btn btn-ghost">← Home</Link>
        </div>

        {/* Layout */}
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Quick Menu */}
          <aside className="lg:col-span-1">
            <nav className="sticky top-6 rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Quick menu</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#overview" className="hover:underline">Overview</a></li>
                <li><a href="#data-we-collect" className="hover:underline">Data We Collect</a></li>
                <li><a href="#how-we-use" className="hover:underline">How We Use Data</a></li>
                <li><a href="#cookies" className="hover:underline">Cookies & Local Storage</a></li>
                <li><a href="#leaderboard" className="hover:underline">Leaderboard & Profiles</a></li>
                <li><a href="#sharing" className="hover:underline">Sharing & Providers</a></li>
                <li><a href="#transfers" className="hover:underline">International Transfers</a></li>
                <li><a href="#retention" className="hover:underline">Retention & Deletion</a></li>
                <li><a href="#your-rights" className="hover:underline">Your Rights</a></li>
                <li><a href="#children" className="hover:underline">Children’s Privacy</a></li>
                <li><a href="#security" className="hover:underline">Security</a></li>
                <li><a href="#changes" className="hover:underline">Changes</a></li>
                <li><a href="#contact" className="hover:underline">Contact</a></li>
              </ul>
            </nav>
          </aside>

          {/* Sections */}
          <section className="space-y-4 lg:col-span-3">
            <Section id="overview" title="Overview" defaultOpen>
              <p>
                Word Chains (“we”, “our”, “us”) is an online word game. This policy explains what we collect,
                how we use it, and your choices. We keep it simple: we collect what’s needed to run the game,
                show leaderboards, and improve reliability. We do not sell your data.
              </p>
            </Section>

            <Section id="data-we-collect" title="Data We Collect">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <b>Account data (via Google Sign-In):</b> Google user ID, name, email, and profile image.
                </li>
                <li>
                  <b>Public username:</b> the handle you choose during onboarding (displayed on leaderboards/profile).
                </li>
                <li>
                  <b>Gameplay stats:</b> totals, records (e.g., best score, longest chain, highest multiplier), category counts.
                </li>
                <li>
                  <b>Technical logs:</b> IP address, device/browser info, error logs, and basic request metadata.
                </li>
                <li>
                  <b>Cookies & local storage:</b> session cookies for sign-in; local keys for gameplay UX (e.g., cached stats).
                </li>
              </ul>
            </Section>

            <Section id="how-we-use" title="How We Use Data">
              <ul className="list-disc space-y-2 pl-5">
                <li>Authenticate users and manage accounts.</li>
                <li>Store and display gameplay stats and leaderboards.</li>
                <li>Improve performance, troubleshoot, and fight abuse/fraud.</li>
                <li>Send essential service communications when necessary.</li>
                <li>Comply with legal obligations when applicable.</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Legal bases (EEA/UK): performance of a contract, legitimate interests (security/quality), and consent where required.
              </p>
            </Section>

            <Section id="cookies" title="Cookies & Local Storage">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <b>Required cookies:</b> session/auth cookies (NextAuth) to keep you signed in.
                </li>
                <li>
                  <b>Local storage:</b> items like <code>wc_stats</code>, <code>wc_peak_multipliers</code>, or a local
                  device ID to enhance gameplay UX on your device. Clear your browser data to remove them.
                </li>
                <li>
                  <b>Optional analytics:</b> If we add analytics or additional cookies in the future, we’ll update this page
                  and request consent where required.
                </li>
              </ul>
            </Section>

            <Section id="leaderboard" title="Leaderboard & Profiles">
              <ul className="list-disc space-y-2 pl-5">
                <li><b>Public:</b> username, avatar image (if any), and game stats shown on leaderboards and your profile.</li>
                <li><b>Not public:</b> your email address and internal identifiers.</li>
                <li>We may remove suspicious entries to protect fairness and integrity.</li>
              </ul>
            </Section>

            <Section id="sharing" title="Sharing & Providers">
              <p>
                We don’t sell personal data. We share limited data with service providers that help operate Word Chains:
                hosting/build (e.g., Vercel), managed database (PostgreSQL), and authentication (Google Sign-In).
                Providers process data under our instructions and safeguards. We may disclose data to comply with law
                or to protect rights, safety, and service integrity.
              </p>
            </Section>

            <Section id="transfers" title="International Transfers">
              <p>
                Data may be processed in countries outside your own. Where required, appropriate safeguards are used
                for cross-border transfers.
              </p>
            </Section>

            <Section id="retention" title="Data Retention & Deletion">
              <ul className="list-disc space-y-2 pl-5">
                <li><b>Account & stats:</b> kept while your account is active.</li>
                <li>
                  <b>Deletion:</b> on verified request, we delete/anonymize account-linked stats and profile data.
                  Aggregated or de-identified data may be retained.
                </li>
                <li><b>Local storage:</b> remains on your device until you clear it.</li>
              </ul>
            </Section>

            <Section id="your-rights" title="Your Rights & Choices">
              <p className="mb-2">
                Depending on your region, you may have rights to access, correct, delete, object/restrict processing,
                or request portability. You can also withdraw consent where processing relies on consent.
              </p>
              <p>
                To exercise rights, email <a className="underline" href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a> from the address linked to your account.
              </p>
            </Section>

            <Section id="children" title="Children’s Privacy">
              <p>
                The Service is not directed to children under the lawful age of online consent in their region.
                If a child provided data without appropriate consent, contact us and we’ll delete it.
              </p>
            </Section>

            <Section id="security" title="Security">
              <p>
                We use reasonable technical and organizational safeguards. No service can guarantee perfect security,
                but we work to protect your data against unauthorized access and misuse.
              </p>
            </Section>

            <Section id="changes" title="Changes to This Policy">
              <p>
                We may update this policy. We’ll revise the effective date above and, for material changes,
                may provide in-app notice.
              </p>
            </Section>

            <Section id="contact" title="Contact">
              <p>
                Questions or requests? Email <a className="underline" href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a>.
              </p>
            </Section>
          </section>
        </div>
      </div>
    </main>
  );
}
