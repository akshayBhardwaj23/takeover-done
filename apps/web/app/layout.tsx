import './globals.css';
import { Providers } from './providers';

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
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
              <a href="/" className="font-semibold">AI‑Ecom</a>
              <nav className="flex items-center gap-4 text-sm">
                <a href="/integrations" className="hover:underline">Integrations</a>
                <a href="/inbox" className="hover:underline">Inbox</a>
                <a href="/api/auth/signin" className="rounded bg-black px-3 py-1.5 text-white">Sign in</a>
                <a href="/api/auth/signout" className="rounded border px-3 py-1.5">Sign out</a>
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
