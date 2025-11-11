import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { fontSans } from './fonts';
import PageFade from './components/PageFade';
import Header from './nav-header';
import Footer from './components/Footer';
import Script from 'next/script';
import Analytics from './components/Analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: {
    default:
      'Zyyp AI — Shopify support inbox with AI replies (Starter $29/mo, Growth $99/mo, Pro $299/mo, Enterprise custom)',
    template: '%s - Zyyp AI',
  },
  description:
    'Zyyp.ai is the AI-powered support inbox for Shopify teams. Plans start at $29/mo (Starter), $99/mo (Growth), $299/mo (Pro), with Enterprise custom contracts for higher volumes.',
  openGraph: {
    title:
      'Zyyp AI — Shopify support inbox with AI replies (Starter $29/mo, Growth $99/mo, Pro $299/mo, Enterprise custom)',
    description:
      'Connect Shopify and email to send AI-crafted replies, manage orders, and automate customer communication. Pricing tiers: Starter $29/mo, Growth $99/mo, Pro $299/mo, Enterprise custom.',
    siteName: 'Zyyp AI',
  },
  twitter: {
    title:
      'Zyyp AI — Shopify support inbox with AI replies (Starter $29/mo, Growth $99/mo, Pro $299/mo, Enterprise custom)',
    description:
      'AI-powered customer support for Shopify merchants. Starter $29/mo, Growth $99/mo, Pro $299/mo, Enterprise custom with volume pricing.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`bg-white ${fontSans.variable}`}>
      <body
        className="bg-white text-gray-900"
        style={{ fontFamily: 'var(--font-sans), ui-sans-serif, system-ui' }}
      >
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        ) : null}
        <Providers>
          {GA_ID ? <Analytics /> : null}
          <Header />
          <PageFade>{children}</PageFade>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
