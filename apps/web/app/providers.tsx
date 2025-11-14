'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../lib/trpc';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30 seconds - data is fresh for 30s
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnMount: true, // Refetch on mount if stale
            refetchOnReconnect: true, // Refetch on reconnect
            retry: 1, // Only retry once on failure
            gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          maxBatchSize: 10, // Batch up to 10 requests
        }),
      ],
    }),
  );

  return (
    <SessionProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  );
}
