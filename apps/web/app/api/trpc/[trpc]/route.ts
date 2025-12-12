import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { apiLimiter, checkRateLimit } from '../../../../lib/rate-limit';
import { appRouter } from '@ai-ecom/api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trpc: string }> | { trpc: string } },
) {
  return handler(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ trpc: string }> | { trpc: string } },
) {
  return handler(request, params);
}

const handler = async (
  request: Request,
  params: Promise<{ trpc: string }> | { trpc: string },
) => {
  const resolvedParams = await Promise.resolve(params);

  try {
    // Rate limiting check (IP-based) - only in production
    if (process.env.NODE_ENV === 'production') {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const rateLimitResult = await checkRateLimit(apiLimiter, ip, 100, 60000);

      if (!rateLimitResult.success) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: { 'content-type': 'application/json' },
          }
        );
      }
    }

    // Request size guard (1MB) for API calls
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      });
    }

    const session = await getServerSession(authOptions);

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: async () => {
        // Lazy user upsert - only when needed, not blocking handler
        let userId: string | null = null;
        if (session?.user?.email) {
          try {
            const { prisma } = await import('@ai-ecom/db');
            const user = await prisma.user.upsert({
              where: { email: session.user.email },
              create: {
                email: session.user.email,
                name: session.user.name || null,
              },
              update: {},
              select: { id: true },
            });
            userId = user.id;
          } catch (error) {
            console.error('[tRPC] Error fetching/creating user:', error);
          }
        }
        
        return {
          session,
          userId,
        };
      },
      onError: ({ error, path, type }) => {
        console.error(
          '[tRPC] Error on path',
          path,
          'type:',
          type,
          'error:',
          error,
        );
      },
    });

    return response;
  } catch (error: any) {
    console.error('[tRPC] Handler error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details:
          process.env.NODE_ENV === 'development' ? String(error) : undefined,
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
};
