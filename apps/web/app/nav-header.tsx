'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const user = session?.user;

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-6xl items-center justify-between gap-6 rounded-full border border-slate-900/10 bg-white/80 px-6 py-4 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-base font-black uppercase tracking-[0.35em] text-slate-900"
          >
            Zyyp
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            <Link href="/integrations" className="transition hover:text-slate-900">
              Integrations
            </Link>
            {isAuthed && (
              <>
                <Link href="/playbooks" className="transition hover:text-slate-900">
                  Playbooks
                </Link>
                <Link href="/analytics" className="transition hover:text-slate-900">
                  Support Analytics
                </Link>
                <Link
                  href="/shopify-analytics"
                  className="transition hover:text-slate-900"
                >
                  Business Analytics
                </Link>
                <Link href="/usage" className="transition hover:text-slate-900">
                  Usage
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthed ? (
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 md:flex">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt="avatar"
                    className="h-8 w-8 rounded-full border border-slate-900/10 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
                )}
                <span className="text-slate-600">
                  {user?.name ?? user?.email}
                </span>
              </div>
              <button
                className="rounded-full border border-slate-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-900/40 hover:text-slate-900"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-black"
              onClick={() => signIn('google')}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
