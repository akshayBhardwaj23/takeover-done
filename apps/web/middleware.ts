import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import nextAuthMiddleware from 'next-auth/middleware';
import { apiLimiter, checkRateLimit } from './lib/rate-limit';

const shouldBlockIndexing = process.env.BLOCK_INDEXING === 'true';
const ignoredPrefixes = [
  '/_next',
  '/api',
  '/fonts',
  '/images',
  '/public',
  '/favicon',
];

export default async function middleware(request: NextRequest) {
  // Rate Limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await checkRateLimit(apiLimiter, ip, 100, 60000);
    if (!success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  const result = await nextAuthMiddleware(request);
  const response = result instanceof NextResponse ? result : NextResponse.next();

  if (shouldBlockIndexing) {
    const path = request.nextUrl.pathname;
    const isIgnored = ignoredPrefixes.some((prefix) => path.startsWith(prefix));
    if (!isIgnored) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/integrations/:path*',
    '/inbox/:path*',
    '/playbooks/:path*',
    '/analytics/:path*',
    '/shopify-analytics/:path*',
  ],
};


