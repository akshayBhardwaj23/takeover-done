'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

function trackPageview(url: string) {
  if (!GA_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('config', GA_ID, {
    page_path: url,
  });
}

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const search = searchParams.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    trackPageview(url);
  }, [pathname, searchParams]);

  return null;
}
