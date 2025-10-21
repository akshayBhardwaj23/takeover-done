import './globals.css';
import { Providers } from './providers';
import Header from './nav-header';
import { fontSans } from './fonts';
import PageFade from './components/PageFade';
import SmoothScroll from './components/SmoothScroll';
import CursorFollower from './components/CursorFollower';

export const metadata = {
  title: 'AI E-Commerce Support Assistant',
  description: 'Unified inbox with AI for Shopify support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`bg-white ${fontSans.variable}`}>
      <body className="bg-white text-gray-900" style={{ fontFamily: 'var(--font-sans), ui-sans-serif, system-ui' }}>
        <Providers>
          <Header />
          <PageFade>{children}</PageFade>
          <SmoothScroll />
          <CursorFollower />
        </Providers>
      </body>
    </html>
  );
}
