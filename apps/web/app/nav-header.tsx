'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '../lib/trpc';
import { ChevronDown, Mail, Store, Menu, X } from 'lucide-react';
export default function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthed = status === 'authenticated';
  const user = session?.user;
  const { data: emailUsage } = trpc.checkEmailLimit.useQuery(undefined, {
    enabled: isAuthed,
    refetchInterval: 60000,
    staleTime: 30_000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const { data: connectionsData, isLoading: connectionsLoading } =
    trpc.connections.useQuery(undefined, {
      enabled: isAuthed,
      staleTime: 120_000, // Cache for 2 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists in cache
      refetchOnReconnect: false,
    });

  const isTrial = emailUsage?.trial?.isTrial;
  const trialExpired = emailUsage?.trial?.expired;
  const emailLimit = emailUsage?.limit ?? 0;
  const rawRemaining = emailUsage?.remaining ?? 0;
  const emailsRemainingCount =
    emailLimit === -1 ? -1 : Math.max(0, rawRemaining);
  const emailsRemainingLabel =
    emailLimit === -1
      ? 'Unlimited emails'
      : `${emailsRemainingCount} emails left`;

  const [storesOpen, setStoresOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const storesHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const analyticsHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const profileHoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (storesHoverTimeout.current) clearTimeout(storesHoverTimeout.current);
      if (analyticsHoverTimeout.current)
        clearTimeout(analyticsHoverTimeout.current);
      if (profileHoverTimeout.current)
        clearTimeout(profileHoverTimeout.current);
    };
  }, []);

  const stores = useMemo(() => {
    const rawConnections =
      (connectionsData?.connections as Array<{
        id: string;
        type: string;
        shopDomain: string | null;
        metadata: unknown;
      }>) ?? [];
    if (!rawConnections.length) return [];
    return rawConnections
      .filter((conn) => conn.type === 'SHOPIFY')
      .map((conn) => {
        const metadata =
          (conn.metadata as Record<string, unknown> | null) ?? {};
        const metaStoreName =
          typeof (metadata as { storeName?: unknown }).storeName === 'string'
            ? (metadata as { storeName?: string }).storeName
            : undefined;
        const name =
          metaStoreName ??
          conn.shopDomain?.replace('.myshopify.com', '') ??
          'Store';
        return {
          id: conn.id,
          name,
          shopDomain: conn.shopDomain ?? '',
        };
      })
      .filter((store) => store.shopDomain);
  }, [connectionsData]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-6xl items-center justify-between gap-6 rounded-full border border-slate-900/10 bg-white/80 px-6 py-4 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur supports-[backdrop-filter]:bg-white/70 relative z-50">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-base font-black uppercase tracking-[0.35em] text-slate-900"
          >
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
              <Image
                src="/zyyp%20rounded.png"
                alt="Zyyp Logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span>Zyyp</span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            <Link
              href="/integrations"
              className="transition hover:text-slate-900"
            >
              Integrations
            </Link>
            {isAuthed && (
              <>
                <Link
                  href="/inbox"
                  className="flex items-center gap-1 transition hover:text-slate-900"
                >
                  <Mail className="h-3.5 w-3.5 opacity-60" />
                  Inbox
                </Link>
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (storesHoverTimeout.current)
                      clearTimeout(storesHoverTimeout.current);
                    setStoresOpen(true);
                  }}
                  onMouseLeave={() => {
                    storesHoverTimeout.current = setTimeout(
                      () => setStoresOpen(false),
                      150,
                    );
                  }}
                  onFocusCapture={() => {
                    if (storesHoverTimeout.current)
                      clearTimeout(storesHoverTimeout.current);
                    setStoresOpen(true);
                  }}
                  onBlurCapture={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      storesHoverTimeout.current = setTimeout(
                        () => setStoresOpen(false),
                        150,
                      );
                    }
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 transition hover:text-slate-900"
                    aria-haspopup="menu"
                    aria-expanded={storesOpen}
                  >
                    Stores
                    <Store className="h-3.5 w-3.5 opacity-60" />
                  </button>
                  {storesOpen && (
                    <div className="absolute left-0 top-full z-50 w-64 translate-y-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-lg shadow-slate-900/10">
                      {connectionsLoading ? (
                        <div className="space-y-2 px-4 py-3">
                          <p className="text-slate-500">Loading stores...</p>
                        </div>
                      ) : stores.length ? (
                        <ul className="py-2">
                          {stores.map((store) => (
                            <li key={store.id}>
                              <Link
                                href={`/inbox?shop=${encodeURIComponent(store.shopDomain)}`}
                                className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setStoresOpen(false)}
                              >
                                <div className="font-semibold text-slate-800">
                                  {store.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {store.shopDomain}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="space-y-2 px-4 py-3">
                          <p className="text-slate-500">
                            No stores connected yet.
                          </p>
                          <Link
                            href="/integrations"
                            className="inline-flex items-center text-slate-700 underline hover:text-slate-900"
                            onClick={() => setStoresOpen(false)}
                          >
                            Connect a store
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (analyticsHoverTimeout.current)
                      clearTimeout(analyticsHoverTimeout.current);
                    setAnalyticsOpen(true);
                  }}
                  onMouseLeave={() => {
                    analyticsHoverTimeout.current = setTimeout(
                      () => setAnalyticsOpen(false),
                      150,
                    );
                  }}
                  onFocusCapture={() => {
                    if (analyticsHoverTimeout.current)
                      clearTimeout(analyticsHoverTimeout.current);
                    setAnalyticsOpen(true);
                  }}
                  onBlurCapture={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      analyticsHoverTimeout.current = setTimeout(
                        () => setAnalyticsOpen(false),
                        150,
                      );
                    }
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 transition hover:text-slate-900"
                    aria-haspopup="menu"
                    aria-expanded={analyticsOpen}
                  >
                    Analytics
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                  {analyticsOpen && (
                    <div className="absolute left-0 top-full z-50 w-56 translate-y-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-lg shadow-slate-900/10">
                      <ul className="py-2">
                        <li>
                          <Link
                            href="/analytics"
                            className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setAnalyticsOpen(false)}
                          >
                            Support Analytics
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/shopify-analytics"
                            className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setAnalyticsOpen(false)}
                          >
                            Business Analytics
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/advertisements"
                            className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setAnalyticsOpen(false)}
                          >
                            Advertisements
                          </Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <Link href="/usage" className="transition hover:text-slate-900">
                  Usage
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="p-1 text-slate-700 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {isAuthed ? (
            <div className="flex items-center gap-4">
              {emailUsage && (
                <div className="hidden h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium md:flex">
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-slate-100 px-2 leading-none text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="translate-y-[0.5px]">
                      {emailsRemainingLabel}
                    </span>
                  </span>
                  {isTrial && (
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] leading-none ${
                        trialExpired
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {trialExpired
                        ? 'Trial ended'
                        : `${emailUsage.trial?.daysRemaining ?? 0}d left`}
                    </span>
                  )}
                  {(trialExpired ||
                    (emailLimit !== -1 && emailsRemainingCount === 0)) && (
                    <Link
                      href="/usage"
                      className="ml-1 inline-flex h-6 items-center rounded-full bg-rose-600 px-3 text-white leading-none transition hover:bg-rose-700"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              )}
              <div
                className="relative hidden md:flex"
                onMouseEnter={() => {
                  if (profileHoverTimeout.current)
                    clearTimeout(profileHoverTimeout.current);
                  setProfileOpen(true);
                }}
                onMouseLeave={() => {
                  profileHoverTimeout.current = setTimeout(
                    () => setProfileOpen(false),
                    150,
                  );
                }}
                onFocusCapture={() => {
                  if (profileHoverTimeout.current)
                    clearTimeout(profileHoverTimeout.current);
                  setProfileOpen(true);
                }}
                onBlurCapture={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    profileHoverTimeout.current = setTimeout(
                      () => setProfileOpen(false),
                      150,
                    );
                  }
                }}
              >
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-full border border-transparent px-2 py-1 text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt="avatar"
                      className="h-8 w-8 rounded-full border border-slate-900/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500">
                      {(user?.name ?? user?.email ?? '?')
                        ?.toString()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[140px] truncate">
                    {user?.name ?? user?.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-aria-expanded:rotate-180" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 w-48 translate-y-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-lg shadow-slate-900/10">
                    <ul className="py-2">
                      <li>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setProfileOpen(false)}
                        >
                          Profile
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/account"
                          className="block px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setProfileOpen(false)}
                        >
                          Account
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                className="hidden rounded-full border border-slate-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-900/40 hover:text-slate-900 md:block"
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.href = '/';
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-black"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-white px-6 pb-10 pt-28 md:hidden">
          <nav className="flex flex-col gap-6 text-lg font-medium text-slate-700">
            <Link
              href="/integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="block border-b border-slate-100 pb-4"
            >
              Integrations
            </Link>

            {isAuthed && (
              <>
                <Link
                  href="/inbox"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block border-b border-slate-100 pb-4"
                >
                  Inbox
                </Link>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Stores
                  </div>
                  {stores.length > 0 ? (
                    <ul className="space-y-3 pl-2">
                      {stores.map((store) => (
                        <li key={store.id}>
                          <Link
                            href={`/inbox?shop=${encodeURIComponent(store.shopDomain)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-slate-600 hover:text-slate-900"
                          >
                            {store.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="pl-2 text-sm text-slate-400">
                      No stores connected
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Analytics
                  </div>
                  <ul className="space-y-3 pl-2">
                    <li>
                      <Link
                        href="/analytics"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-slate-600 hover:text-slate-900"
                      >
                        Support Analytics
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/shopify-analytics"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-slate-600 hover:text-slate-900"
                      >
                        Business Analytics
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/advertisements"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-slate-600 hover:text-slate-900"
                      >
                        Advertisements
                      </Link>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/usage"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block border-b border-slate-100 pb-4"
                >
                  Usage
                </Link>

                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-4 flex items-center gap-3">
                    {user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt="avatar"
                        className="h-10 w-10 rounded-full border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        {(user?.name ?? user?.email ?? '?')
                          ?.toString()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">
                        {user?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pl-2">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-slate-600 hover:text-slate-900"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-slate-600 hover:text-slate-900"
                    >
                      Account
                    </Link>
                    <button
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await signOut({ redirect: false });
                        window.location.href = '/';
                      }}
                      className="block text-rose-600 hover:text-rose-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
