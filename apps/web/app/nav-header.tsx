'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const user = session?.user;

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <a href="/" className="font-semibold">
          AI‑Ecom
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/integrations" className="hover:underline">
            Integrations
          </a>
          <a href="/inbox" className="hover:underline">
            Inbox
          </a>
          {isAuthed ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt="avatar"
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-gray-200" />
                )}
                <span className="text-gray-800">
                  {user?.name ?? user?.email}
                </span>
              </div>
              <button
                className="rounded border px-3 py-1.5 cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="rounded bg-black px-3 py-1.5 text-white cursor-pointer"
              onClick={() => signIn('google')}
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
