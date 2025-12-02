export const metadata = {
  title: 'Terms & Conditions',
  description: "Review the terms for using Zyyp's AI-powered support platform.",
};

const sections = [
  {
    title: '1. Agreement to terms',
    body: `By accessing or using Zyyp, you agree to these Terms & Conditions.
If you do not agree, you may not access the platform.`,
  },
  {
    title: '2. Accounts & security',
    body: `You are responsible for maintaining the security of your account and passwords.
Notify us immediately of any unauthorized use. Zyyp is not liable for losses caused by your failure to safeguard credentials.`,
  },
  {
    title: '3. Acceptable use',
    body: `You agree not to misuse the service, reverse engineer components, or send spam through connected channels.
We reserve the right to suspend accounts that violate policies.`,
  },
  {
    title: '4. Subscription & billing',
    body: `Plans renew automatically unless canceled. Fees are non-refundable except as required by law.
Taxes and payment processing charges may apply.`,
  },
  {
    title: '5. Intellectual property',
    body: `Zyyp retains all rights, titles, and interest in the platform.
Customer data remains yours. Grant us a limited license to process data for providing the service.`,
  },
  {
    title: '6. Liability',
    body: `To the fullest extent permitted by law, Zyyp's liability is limited to the fees paid in the 12 months preceding the claim.
We provide the service “as is” without warranties.`,
  },
  {
    title: '7. Governing law',
    body: `These terms are governed by the laws of India.
Disputes will be resolved in the courts of Chandigarh, India.`,
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Terms & Conditions
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The fine print that keeps Zyyp running smoothly.
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            These Terms & Conditions govern your use of Zyyp. By subscribing,
            you agree to comply with the policies defined below.
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="whitespace-pre-line text-slate-600">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <footer className="rounded-3xl border border-slate-200 bg-slate-900 px-8 py-10 text-white shadow-lg shadow-slate-900/20">
          <h2 className="text-xl font-semibold">Need clarifications?</h2>
          <p className="mt-3 text-white/80">
            Email legal@zyyp.ai and we will get back within 24 hours on business
            days.
          </p>
        </footer>
      </section>
    </main>
  );
}




