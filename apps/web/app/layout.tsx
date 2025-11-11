import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { fontSans } from './fonts';
import PageFade from './components/PageFade';
import Header from './nav-header';
import Footer from './components/Footer';
import Script from 'next/script';
import Analytics from './components/Analytics';
import { Suspense } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const OG_IMAGE = 'https://www.zyyp.ai/og-image.png';

export const metadata: Metadata = {
  title: {
    default:
      'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
    template: '%s - Zyyp AI',
  },
  description:
    'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
  openGraph: {
    title:
      'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
    description:
      'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
    siteName: 'Zyyp AI',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Zyyp AI Support Inbox',
      },
    ],
  },
  twitter: {
    title:
      'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
    description:
      'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
    card: 'summary_large_image',
    images: [OG_IMAGE],
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
          <Suspense fallback={null}>{GA_ID ? <Analytics /> : null}</Suspense>
          <Header />
          <PageFade>{children}</PageFade>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
