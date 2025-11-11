export const metadata = {
  title: 'Privacy Policy',
  description:
    'Understand how Zyyp collects, uses, and protects customer information.',
};

const sections = [
  {
    title: '1. Data we collect',
    body: `We collect account details, contact information, billing details, and usage
telemetry that helps us improve reliability. When connected to Shopify or other
platforms, we sync order metadata required to provide support responses.`,
  },
  {
    title: '2. How we use data',
    body: `Data powers our AI workflows, analytics dashboards, and customer support automation.
We never sell data to third parties. Access is limited to authorized personnel with strict role-based controls.`,
  },
  {
    title: '3. Storage & security',
    body: `Your data is encrypted in transit (TLS 1.2+) and at rest. We operate on SOC2-ready infrastructure with
regular penetration testing. Backups are performed daily and retained for a rolling 30-day window.`,
  },
  {
    title: '4. Data retention',
    body: `We retain customer data for the duration of your contract plus 90 days.
You can request deletion at any time by emailing privacy@zyyp.ai.`,
  },
  {
    title: '5. Your rights',
    body: `You have the right to access, update, export, or delete your data.
We comply with GDPR, CCPA, and applicable Indian data regulations.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Privacy Policy
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            How Zyyp protects your data.
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            We are committed to safeguarding information collected through the
            Zyyp platform and ensuring your customers trust every interaction.
            This policy outlines our practices as of {new Date().getFullYear()}.
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="text-slate-600 whitespace-pre-line">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <footer className="rounded-3xl border border-slate-200 bg-slate-900 px-8 py-10 text-white shadow-lg shadow-slate-900/20">
          <h2 className="text-xl font-semibold">Questions?</h2>
          <p className="mt-3 text-white/80">
            Reach out to privacy@zyyp.ai or our Data Protection Officer at 221B,
            Sector 71, Mohali, Punjab 160071, India.
          </p>
        </footer>
      </section>
    </main>
  );
}

