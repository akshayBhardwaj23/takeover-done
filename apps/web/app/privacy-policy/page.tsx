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
  {
    title: '6. Google Analytics Integration',
    body: `When you connect your Google Analytics account to Zyyp, we access and use the following Google user data:

Data Accessed:
We access read-only Google Analytics 4 (GA4) data including:
- GA4 property information (property ID, property name, account ID)
- Website analytics metrics (sessions, users, page views, bounce rate, average session duration)
- E-commerce metrics (revenue, transactions, conversion rate, average order value) if enabled in your GA4 property
- Traffic source data (referral sources, medium, session counts)
- Top performing pages (page paths and view counts)
- Daily trend data (sessions, users, and revenue over time)

We do NOT access:
- Personally identifiable information (PII) about your website visitors
- Individual user browsing behavior or history
- Account-level settings or configurations beyond property listings
- Data from other Google services (Gmail, Google Ads, etc.) unless explicitly connected separately

How We Use This Data:
We use Google Analytics data solely to:
- Display analytics dashboards and reports within your Zyyp account
- Provide insights about your website traffic and performance
- Enable you to view aggregated analytics data alongside your Shopify and support metrics
- Generate trend visualizations and comparative analytics

The data is used exclusively to provide the analytics visualization features you have requested. We do not use this data for advertising, marketing, or any purpose other than displaying it to you within the Zyyp platform.

Data Sharing and Disclosure:
We do NOT share, transfer, or disclose your Google Analytics data to any third parties. The data is:
- Stored securely in our encrypted database
- Accessible only to you (the authenticated user who connected the account)
- Never sold, rented, or shared with advertisers, data brokers, or other services
- Not used for any purpose other than displaying it to you in your dashboard

Data Access Control:
- Only the user who connected their Google Analytics account can view the data
- OAuth tokens are encrypted at rest and automatically refreshed when needed
- You can disconnect your Google Analytics account at any time, which will revoke access and delete stored tokens
- All API calls to Google Analytics are made on your behalf using OAuth 2.0 with read-only permissions

If you have questions about our use of Google Analytics data, please contact privacy@zyyp.ai.`,
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
