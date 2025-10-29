'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const user = session?.user;

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="container-max flex items-center justify-between py-4">
        <a href="/" className="font-semibold tracking-tight text-gray-900">
          AI E-Commerce
        </a>
        <nav className="flex items-center gap-4 text-sm text-gray-600">
          <a
            href="/integrations"
            className="hover:text-gray-900 transition-colors"
          >
            Integrations
          </a>
          {isAuthed && (
            <a
              href="/analytics"
              className="hover:text-gray-900 transition-colors"
            >
              Analytics
            </a>
          )}
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
                <span className="text-gray-600">
                  {user?.name ?? user?.email}
                </span>
              </div>
              <button
                className="btn-secondary cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="btn-brand cursor-pointer"
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
