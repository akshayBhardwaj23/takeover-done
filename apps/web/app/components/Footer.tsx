'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSession, signIn } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';

const socialLinks = [
  { href: 'https://www.linkedin.com', label: 'LinkedIn', external: true },
  { href: 'https://twitter.com', label: 'Twitter', external: true },
  { href: 'https://www.facebook.com', label: 'Facebook', external: true },
];

const policyLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/security', label: 'Security Overview' },
];

export default function Footer() {
  const { status } = useSession();
  const isAuthed = status === 'authenticated';

  const pageLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/demo', label: 'Demo' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#050505] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-20 sm:px-10 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Unlock the power of AI for your Shopify store
              </h2>
              <div className="space-y-3 text-sm uppercase text-white/60">
                <span>Get Support :</span>
                <a
                  href="mailto:hello@zyyp.ai"
                  className="block text-base font-medium leading-6 uppercase text-white hover:text-white/80"
                >
                  hello@zyyp.ai
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm uppercase tracking-widest text-white/60">
                Sign up for newsletter :
              </p>
              <form className="flex max-w-lg items-center gap-4 border-b border-white/20 pb-4 transition focus-within:border-white/60">
                <label htmlFor="newsletter-name" className="sr-only">
                  Email
                </label>
                <input
                  id="newsletter-name"
                  type="text"
                  required
                  placeholder="NAME*"
                  className="flex-1 bg-transparent text-base uppercase tracking-[0.3em] text-white placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full border border-white/30 p-2 transition hover:border-white hover:bg-white hover:text-black"
                  aria-label="Submit newsletter signup"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="grid gap-10 text-sm sm:grid-cols-2 sm:text-base lg:grid-cols-1">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Pages
              </p>
              <ul className="space-y-3">
                {pageLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href as Route}
                      className="tracking-tight text-white hover:text-white/70"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {!isAuthed && (
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        signIn('google', { callbackUrl: '/integrations' })
                      }
                      className="tracking-tight text-white transition hover:text-white/70"
                    >
                      Login
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Social
              </p>
              <ul className="space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer' : undefined}
                      className="flex items-center gap-2 text-white transition hover:text-white/70"
                    >
                      {link.label}
                      <span aria-hidden className="text-white/40">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Company
              </p>
              <div className="space-y-3">
                <div className="space-y-1 text-white/70">
                  <p>Gurugram, 122001</p>
                  <p>India, Asia</p>
                </div>
                <ul className="space-y-3">
                  {policyLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href as Route}
                        className="text-white hover:text-white/70"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none select-none text-right">
          <p className="text-[18vw] font-semibold uppercase leading-none tracking-tight text-white/5 sm:text-[16vw]">
            zyyp
          </p>
        </div>
      </div>
    </footer>
  );
}
