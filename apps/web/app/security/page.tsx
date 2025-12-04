export const metadata = {
  title: 'Security Overview',
  description:
    'Learn about Zyyp\'s enterprise-grade security measures, compliance certifications, and data protection practices.',
};

const sections = [
  {
    title: '1. Enterprise-Grade Encryption',
    body: `All data transmitted to and from Zyyp is encrypted using TLS 1.3, the latest industry standard for secure communication. Data at rest is encrypted using AES-256 encryption, ensuring that your customer information, payment details, and support history remain protected at all times.

Our encryption keys are managed using industry-standard key management systems with automatic rotation policies, ensuring that even in the unlikely event of a breach, your data remains secure.`,
  },
  {
    title: '2. Infrastructure Security',
    body: `Zyyp is built on SOC2-ready infrastructure with multiple layers of security:

- Multi-region deployment with automatic failover for high availability
- DDoS protection and advanced threat detection
- Regular security patches and updates applied automatically
- Network segmentation and firewall protection
- Intrusion detection and prevention systems (IDS/IPS)
- 24/7 security monitoring and incident response team

Our infrastructure undergoes regular penetration testing by third-party security experts to identify and address potential vulnerabilities before they can be exploited.`,
  },
  {
    title: '3. Access Control & Authentication',
    body: `We implement fine-grained role-based access control (RBAC) to ensure that team members only have access to the data they need:

- Multi-factor authentication (MFA) support for all user accounts
- Single Sign-On (SSO) integration with major identity providers
- Session management with automatic timeout policies
- IP whitelisting for enterprise customers
- Granular permission controls for different team roles
- Audit logs for all access and authentication events

Every action within the platform is attributed to a specific user or AI agent, creating a complete audit trail for compliance and security reviews.`,
  },
  {
    title: '4. Data Privacy & Compliance',
    body: `Zyyp is committed to maintaining the highest standards of data privacy and regulatory compliance:

GDPR Compliance:
- Right to access, rectify, and delete personal data
- Data portability and export capabilities
- Privacy by design and default
- Data processing agreements available for EU customers

CCPA Compliance:
- Transparent data collection and usage policies
- Consumer rights to know, delete, and opt-out
- No sale of personal information to third parties

ISO 27001 Standards:
- Information security management system (ISMS)
- Regular security audits and assessments
- Documented security policies and procedures
- Continuous improvement of security controls

We also comply with applicable Indian data protection regulations and industry-specific requirements for e-commerce platforms.`,
  },
  {
    title: '5. Data Retention & Backup',
    body: `Your data is backed up automatically with the following policies:

- Daily automated backups with point-in-time recovery
- 30-day rolling backup retention window
- Geo-redundant backup storage across multiple regions
- Encrypted backups with separate encryption keys
- Regular backup restoration testing to ensure data integrity

Data Retention:
- Active customer data retained for the duration of your contract
- 90-day grace period after contract termination
- On-demand data deletion available upon request
- Secure data destruction using industry-standard methods

You maintain full control over your data and can request exports or deletion at any time through our platform or by contacting our support team.`,
  },
  {
    title: '6. Zero Data Retention Sandbox',
    body: `For customers with strict data residency and privacy requirements, we offer:

- Regional data isolation with data stored in your preferred geographic location
- Private cloud deployment options for enterprise customers
- Custom data retention policies tailored to your compliance needs
- Air-gapped environments for sensitive testing and development
- On-premises deployment options for maximum control

Our sandbox environments ensure that sensitive customer conversations and PII never leave your security boundary, giving you complete control over data sovereignty.`,
  },
  {
    title: '7. Application Security',
    body: `We follow secure development practices throughout our software development lifecycle:

- Regular security code reviews and static analysis
- Dependency scanning for known vulnerabilities
- Automated security testing in CI/CD pipelines
- Bug bounty program with responsible disclosure
- Regular third-party security audits
- OWASP Top 10 protection measures

Input Validation & Protection:
- SQL injection prevention through parameterized queries
- Cross-site scripting (XSS) protection
- Cross-site request forgery (CSRF) tokens
- Content Security Policy (CSP) headers
- Rate limiting and DDoS protection`,
  },
  {
    title: '8. Third-Party Integrations',
    body: `When you connect third-party services like Shopify or Google Analytics, we:

- Use OAuth 2.0 for secure authorization
- Request only the minimum required permissions
- Encrypt and securely store access tokens
- Allow you to revoke access at any time
- Never share your data with unauthorized third parties
- Conduct security reviews of all integration partners

All API communications with third-party services are encrypted and logged for audit purposes. We regularly review our integration partners to ensure they maintain security standards compatible with ours.`,
  },
  {
    title: '9. Incident Response',
    body: `In the event of a security incident, we have a comprehensive response plan:

- 24/7 security operations center (SOC) monitoring
- Immediate incident containment and investigation
- Notification to affected customers within 72 hours
- Transparent communication throughout the incident lifecycle
- Post-incident analysis and remediation
- Regular incident response drills and tabletop exercises

We maintain cyber insurance coverage and work with leading cybersecurity firms to ensure rapid response and recovery in the unlikely event of a security breach.`,
  },
  {
    title: '10. Employee Security Training',
    body: `Our team undergoes regular security awareness training:

- Background checks for all employees with data access
- Security onboarding for new team members
- Quarterly security awareness training
- Phishing simulation exercises
- Secure coding training for developers
- Incident response training and drills
- Non-disclosure agreements (NDAs) for all personnel

We maintain a security-first culture where every team member understands their role in protecting customer data.`,
  },
];

export default function SecurityOverviewPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Security Overview
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Enterprise-grade security you can trust.
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            At Zyyp, security is not an afterthought—it's the foundation of
            everything we build. We protect your customer data with
            military-grade encryption, comprehensive compliance certifications,
            and industry-leading security practices.
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

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold">Security Certifications</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> SOC 2 Type II
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> ISO 27001
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> GDPR Compliant
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> CCPA Compliant
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold">Security Features</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> AES-256 Encryption
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> TLS 1.3
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Multi-Factor Auth
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Role-Based Access
              </li>
            </ul>
          </div>
        </div>

        <footer className="rounded-3xl border border-slate-200 bg-slate-900 px-8 py-10 text-white shadow-lg shadow-slate-900/20">
          <h2 className="text-xl font-semibold">Security Questions?</h2>
          <p className="mt-3 text-white/80">
            For security inquiries, vulnerability reports, or to request our
            security documentation, please contact our security team at{' '}
            <a
              href="mailto:security@zyyp.ai"
              className="font-semibold text-white underline hover:text-white/90"
            >
              security@zyyp.ai
            </a>
            .
          </p>
          <p className="mt-4 text-sm text-white/60">
            If you've discovered a security vulnerability, please report it
            responsibly through our bug bounty program. We appreciate the
            security research community's efforts in keeping Zyyp secure.
          </p>
        </footer>
      </section>
    </main>
  );
}
