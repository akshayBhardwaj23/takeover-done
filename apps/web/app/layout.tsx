import './globals.css';
import { Providers } from './providers';
import Header from './nav-header';

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
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
