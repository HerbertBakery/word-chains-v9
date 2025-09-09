export const metadata = {
  title: "Privacy Policy — Word Chains",
  description: "How Word Chains collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 prose prose-sm sm:prose lg:prose-lg">
      <h1>Privacy Policy — Word Chains</h1>
      <p><strong>Effective date:</strong> September 8, 2025</p>
      <p><strong>Contact:</strong> <a href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a></p>

      <h2>Summary (TL;DR)</h2>
      <ul>
        <li>We use Google Sign-In to create your account.</li>
        <li>Your chosen username is public on the leaderboard and your profile.</li>
        <li>We store gameplay stats; we do not sell your data.</li>
        <li>We use cookies/local storage for sessions and gameplay UX.</li>
      </ul>

      <h2>Who we are</h2>
      <p><strong>Word Chains</strong> is an online word game operated in Nova Scotia, Canada.</p>

      <h2>Information we collect</h2>
      <h3>You provide</h3>
      <ul>
        <li>Account data via Google Sign-In (name, email, Google user ID, profile image).</li>
        <li>Public username you pick during onboarding.</li>
      </ul>
      <h3>Collected automatically</h3>
      <ul>
        <li>IP address, device/browser details, and basic logs (e.g., sign-ins, errors).</li>
        <li>Cookies &amp; local storage (e.g., session cookies; local keys like <code>wc_uid</code> and performance stats).</li>
      </ul>
      <h3>Gameplay &amp; profile</h3>
      <ul>
        <li><strong>Public:</strong> username, rank/score stats, optional avatar image.</li>
        <li><strong>Not public:</strong> your email address and internal IDs.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>Provide the service (auth, leaderboard, stats).</li>
        <li>Improve and protect (security, anti-abuse, troubleshooting, performance).</li>
        <li>Communicate necessary service messages.</li>
      </ul>

      <h2>Legal bases (EEA/UK)</h2>
      <ul>
        <li>Performance of a contract (to provide the game).</li>
        <li>Legitimate interests (security, improvement, fraud prevention).</li>
        <li>Consent where required (e.g., optional analytics/cookies, if enabled).</li>
      </ul>

      <h2>Sharing your information</h2>
      <p>
        We don’t sell personal information. We share limited data with service providers that help operate Word Chains:
        hosting/build (e.g., Vercel), managed database (PostgreSQL), and authentication (Google Sign-In). These
        providers process data under our instructions and safeguards. We may disclose information if required by law
        or to protect rights, safety, and service integrity.
      </p>

      <h2>International transfers</h2>
      <p>Data may be processed in other countries with appropriate safeguards for transfers.</p>

      <h2>Data retention</h2>
      <ul>
        <li><strong>Account &amp; stats:</strong> retained while your account is active.</li>
        <li><strong>Deletion:</strong> upon verified request, we delete or anonymize account-linked stats and profile data. Aggregated or de-identified data that no longer identifies you may be retained.</li>
        <li><strong>Local storage:</strong> remains on your device until you clear your browser data.</li>
      </ul>

      <h2>Your choices &amp; rights</h2>
      <ul>
        <li>Access/Update; Delete; Object/Restrict (EEA/UK); Portability; CPRA rights (CA). We do not “sell” or “share” personal info as defined by CPRA.</li>
      </ul>
      <p>To exercise rights, email <a href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a> from the address tied to your account.</p>

      <h2>Children’s privacy</h2>
      <p>The service is not intended for children under the lawful age of online consent in their region. If a child provided data without appropriate consent, contact us for deletion.</p>

      <h2>Security</h2>
      <p>We use reasonable technical and organizational measures to protect data. No service can guarantee perfect security.</p>

      <h2>Cookies and similar tech</h2>
      <p>We use necessary cookies for sign-in and session continuity, and local storage for gameplay UX. If we add optional analytics or additional cookies, we will update this policy and, where required, request consent.</p>

      <h2>Third-party links</h2>
      <p>External sites/services are governed by their own policies.</p>

      <h2>Changes</h2>
      <p>We may update this policy and adjust the effective date above. Material changes may be communicated in-app.</p>

      <h2>Contact</h2>
      <p>Email: <a href="mailto:huxardedu@gmail.com">huxardedu@gmail.com</a></p>
    </main>
  );
}
