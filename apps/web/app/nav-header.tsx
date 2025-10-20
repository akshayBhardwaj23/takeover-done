'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const user = session?.user;

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="container-max flex items-center justify-between py-4">
        <a href="/" className="font-semibold tracking-tight">
          ZYYP
        </a>
        <nav className="flex items-center gap-4 text-sm text-white/80">
          <a href="/integrations" className="hover:text-white">
            Integrations
          </a>
          <a href="/inbox" className="hover:text-white">
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
                  <div className="h-6 w-6 rounded-full bg-white/10" />
                )}
                <span className="text-white/80">
                  {user?.name ?? user?.email}
                </span>
              </div>
              <button
                className="btn-ghost cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="btn-primary cursor-pointer"
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
