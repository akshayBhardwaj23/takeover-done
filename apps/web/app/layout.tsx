import './globals.css';
import { Providers } from './providers';
import { fontSans } from './fonts';
import PageFade from './components/PageFade';
import Header from './nav-header';
import Footer from './components/Footer';

export const metadata = {
  title: 'ZYYP Support Assistant',
  description: 'Unified inbox with AI for Shopify support',
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
