'use client';

export default function FAQ() {
  const faqs = [
    {
      question: 'What problem does ZYYP solve?',
      answer:
        'We centralize customer emails, Shopify order data, and AI replies in one workspace so your team resolves issues without juggling tools or copy-pasting order details.',
    },
    {
      question: 'How quickly can we get set up?',
      answer:
        'Connect Shopify and your support inbox, choose recommended automation rules, and you can start approving AI drafts within 15 minutes. No developers required.',
    },
    {
      question: 'Will the AI send messages without approval?',
      answer:
        'You control who approves what. Start with human-in-the-loop for every message, then enable auto-approve when confidence scores meet your thresholds.',
    },
    {
      question: 'What channels do you support out of the box?',
      answer:
        'Shopify, Mail, Slack, and Meta Ads are supported today. More channels like Zendesk and Gorgias are on our roadmap.',
    },
    {
      question: 'How is my customer data protected?',
      answer:
        'We encrypt data in transit and at rest, offer regional data residency, and provide granular role permissions to ensure your support workflows stay compliant.',
    },
    {
      question: 'Can I measure the impact on my support team?',
      answer:
        'Yes. Our analytics track response time, AI adoption, refunds issued, escalations, and customer satisfaction so you always know the ROI.',
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            FAQs
          </p>
          <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Find all your doubts and questions in one place. Still need help?{' '}
            <a
              href="mailto:hi@zyyp.ai"
              className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
            >
              Email our team
            </a>{' '}
            or{' '}
            <a
              href="https://cal.com/notus/demo"
              className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
              target="_blank"
              rel="noreferrer"
            >
              book a call
            </a>
            .
          </p>
        </div>
        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm shadow-slate-200/50"
            >
              <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-900 transition group-open:text-slate-700">
                {faq.question}
                <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
