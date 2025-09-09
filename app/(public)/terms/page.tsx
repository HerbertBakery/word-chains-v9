import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Terms of Service — Word Chains",
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

export default function TermsPage() {
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
              <h1 className="text-3xl font-bold md:text-4xl">Terms of Service</h1>
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
                <li><a href="#eligibility" className="hover:underline">Eligibility</a></li>
                <li><a href="#accounts" className="hover:underline">Accounts & Usernames</a></li>
                <li><a href="#leaderboards" className="hover:underline">Leaderboards & Profiles</a></li>
                <li><a href="#acceptable-use" className="hover:underline">Acceptable Use</a></li>
                <li><a href="#your-content" className="hover:underline">Your Content</a></li>
                <li><a href="#our-ip" className="hover:underline">Our Content & IP</a></li>
                <li><a href="#changes" className="hover:underline">Changes & Availability</a></li>
                <li><a href="#third-parties" className="hover:underline">Third-Party Services</a></li>
                <li><a href="#termination" className="hover:underline">Termination</a></li>
                <li><a href="#disclaimers" className="hover:underline">Disclaimers</a></li>
                <li><a href="#liability" className="hover:underline">Limitation of Liability</a></li>
                <li><a href="#indemnity" className="hover:underline">Indemnity</a></li>
                <li><a href="#law" className="hover:underline">Governing Law & Venue</a></li>
                <li><a href="#contact" className="hover:underline">Contact</a></li>
              </ul>
            </nav>
          </aside>

          {/* Sections */}
          <section className="space-y-4 lg:col-span-3">
            <Section id="overview" title="Overview" defaultOpen>
              <p>
                These Terms govern your access to and use of the Word Chains website, game, and related services
                (the “Service”). By using the Service, you agree to these Terms and to our{" "}
                <Link href="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </Section>

            <Section id="eligibility" title="Eligibility">
              <ul className="list-disc space-y-2 pl-5">
                <li>You must be old enough to form a binding contract in your jurisdiction.</li>
                <li>If under that age, you may only use the Service with parent/guardian consent.</li>
              </ul>
            </Section>

            <Section id="accounts" title="Accounts & Usernames">
              <ul className="list-disc space-y-2 pl-5">
                <li>We use Google Sign-In for authentication.</li>
                <li>You choose a public username; don’t impersonate others or use offensive/abusive names.</li>
                <li>You’re responsible for all activity under your account.</li>
              </ul>
            </Section>

            <Section id="leaderboards" title="Leaderboards & Profiles">
              <ul className="list-disc space-y-2 pl-5">
                <li>Your username and gameplay statistics may appear publicly on leaderboards and your profile.</li>
                <li>We may remove entries or reset scores that appear inauthentic (cheating/automation/exploits).</li>
                <li>We may take steps to protect fairness and service integrity.</li>
              </ul>
            </Section>

            <Section id="acceptable-use" title="Acceptable Use">
              <ul className="list-disc space-y-2 pl-5">
                <li>No cheating, exploiting bugs, tampering with APIs, or automating gameplay.</li>
                <li>No harassment, hate speech, illegal content, or infringement of others’ rights.</li>
                <li>No attempts to reverse engineer, overload, or disrupt the Service.</li>
              </ul>
            </Section>

            <Section id="your-content" title="Your Content">
              <p>
                You retain rights to content you submit (e.g., usernames, messages, suggestions), and grant us a
                worldwide, non-exclusive, royalty-free license to host, store, display, and reproduce that content
                as needed to operate and promote the Service. You represent you have rights to submit such content.
              </p>
            </Section>

            <Section id="our-ip" title="Our Content & IP">
              <p>
                The Service (including code, design, game rules, graphics, and trademarks) is owned by us or our
                licensors and protected by intellectual property laws. You may not copy, modify, or distribute it
                except as permitted by these Terms or applicable law.
              </p>
            </Section>

            <Section id="changes" title="Changes & Availability">
              <p>
                We may change, suspend, or discontinue any part of the Service at any time. We may update these Terms;
                we’ll post updates here and change the effective date. Material changes may be communicated in-app.
              </p>
            </Section>

            <Section id="third-parties" title="Third-Party Services">
              <p>
                The Service may integrate with or link to third-party services (e.g., Google Sign-In, hosting providers).
                We are not responsible for third-party services or their policies.
              </p>
            </Section>

            <Section id="termination" title="Termination">
              <p>
                You may stop using the Service at any time. We may suspend or terminate your access if you violate
                these Terms or to protect the Service or other users. Sections that should reasonably survive will
                continue after termination (e.g., IP, disclaimers, liability limits).
              </p>
            </Section>

            <Section id="disclaimers" title="Disclaimers">
              <p>
                THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
                INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT. We do not warrant uninterrupted or error-free operation or that data will be preserved
                without loss.
              </p>
            </Section>

            <Section id="liability" title="Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM
                OR RELATED TO YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE
                SHALL NOT EXCEED (A) THE AMOUNT YOU PAID US (IF ANY) IN THE 12 MONTHS BEFORE THE CLAIM, OR (B) CAD $50,
                WHICHEVER IS GREATER.
              </p>
            </Section>

            <Section id="indemnity" title="Indemnity">
              <p>
                You agree to indemnify and hold us harmless against claims, liabilities, damages, losses, and expenses
                (including reasonable legal fees) arising from your use of the Service, your content, or your violation
                of these Terms or applicable law.
              </p>
            </Section>

            <Section id="law" title="Governing Law & Venue">
              <p>
                These Terms are governed by the laws of the Province of Nova Scotia and the laws of Canada applicable
                therein, without regard to conflict-of-laws rules. You agree to the exclusive jurisdiction and venue of
                the courts located in Nova Scotia, Canada.
              </p>
            </Section>

            <Section id="contact" title="Contact">
              <p>
                Questions about these Terms? Email{" "}
                <a className="underline" href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a>.
              </p>
            </Section>
          </section>
        </div>
      </div>
    </main>
  );
}
