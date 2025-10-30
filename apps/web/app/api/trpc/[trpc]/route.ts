import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@ai-ecom/api';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const handler = async (request: Request) => {
  // Request size guard (1MB) for API calls
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }

  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => ({
      session,
      userId: session?.user?.email || null,
    }),
  });
};

export { handler as GET, handler as POST };
