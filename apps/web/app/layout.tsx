import './globals.css';
import { Providers } from './providers';
import { fontSans } from './fonts';
import PageFade from './components/PageFade';
import Header from './nav-header';
import Footer from './components/Footer';

export const metadata = {
  title:
    'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
  description:
    'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
  openGraph: {
    title:
      'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
    description:
      'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
  },
  twitter: {
    title:
      'Artificial Intelligence (AI) support assistance for fast paced businesses - Send Replies, Manage Orders and Customer Experience',
    description:
      'Zyyp.ai is an AI-powered support assistant built for fast-paced ecommerce businesses. Connect Shopify and email to send smart replies, manage orders, and automate customer communication — all from one dashboard.',
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
        <Providers>
          <Header />
          <PageFade>{children}</PageFade>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
