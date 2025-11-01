import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

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
  const procedureName = resolvedParams.trpc;

  console.log(
    '[tRPC] Handler called:',
    request.url,
    'Procedure:',
    procedureName,
  );

  try {
    // Request size guard (1MB) for API calls
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      console.log('[tRPC] Request too large');
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      });
    }

    const session = await getServerSession(authOptions);
    console.log('[tRPC] Session:', session?.user?.email || 'no session');

    // Get user ID from database using email, create user if doesn't exist
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
        console.log('[tRPC] User ID:', userId);
      } catch (error) {
        console.error('[tRPC] Error fetching/creating user:', error);
      }
    }

    // Lazy import router to ensure it's loaded - do this BEFORE session/auth
    let appRouter;
    try {
      console.log('[tRPC] Starting router import...');
      const apiModule = await import('@ai-ecom/api');
      console.log('[tRPC] Module imported, checking for appRouter...');
      console.log('[tRPC] Module keys:', Object.keys(apiModule));
      appRouter = apiModule.appRouter;
      if (!appRouter) {
        throw new Error('appRouter is undefined in @ai-ecom/api module');
      }
      console.log('[tRPC] Router imported successfully');
    } catch (importError: any) {
      const errorMessage = importError?.message || 'Unknown import error';
      const errorStack = importError?.stack || 'No stack trace';
      const errorName = importError?.name || 'Error';

      console.error('[tRPC] ========== IMPORT ERROR ==========');
      console.error('[tRPC] Error name:', errorName);
      console.error('[tRPC] Error message:', errorMessage);
      console.error('[tRPC] Error stack:', errorStack);
      if (importError?.cause) {
        console.error('[tRPC] Error cause:', importError.cause);
      }
      console.error('[tRPC] ===================================');

      return new Response(
        JSON.stringify({
          error: 'Failed to load API router',
          name: errorName,
          message: errorMessage,
          details:
            process.env.NODE_ENV === 'development'
              ? {
                  message: errorMessage,
                  stack: errorStack,
                  cause: importError?.cause,
                }
              : undefined,
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    console.log(
      '[tRPC] Calling fetchRequestHandler for procedure:',
      procedureName,
    );
    console.log('[tRPC] Request URL:', request.url);
    console.log('[tRPC] Router available:', !!appRouter);

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: () => {
        console.log('[tRPC] Creating context:', {
          hasSession: !!session,
          userId,
        });
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
        if (error.code === 'NOT_FOUND') {
          console.error('[tRPC] Procedure not found:', path);
        }
      },
    });

    console.log(
      '[tRPC] Response status:',
      response.status,
      'for procedure:',
      procedureName,
    );
    return response;
  } catch (error: any) {
    console.error('[tRPC] Handler error:', error);
    console.error('[tRPC] Error stack:', error?.stack);
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
