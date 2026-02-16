'use client';

import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * React Query configuration optimised for cost minimisation:
 *
 * - staleTime: 10 min — data is considered fresh, no background refetch.
 * - gcTime: 30 min — queries stay in memory even when unmounted.
 * - refetchOnWindowFocus: false — user must explicitly hit Refresh.
 * - refetchOnReconnect: false — don't auto-fetch on reconnect; the mutation
 *   flush handles pending writes, and the user can refresh manually.
 * - retry: 1 — one retry on transient failures, then surface the error.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1_000,
        gcTime: 30 * 60 * 1_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 1,
        retryDelay: attempt => Math.min(1_000 * 2 ** attempt, 10_000),
      },
    },
  });
}

// Singleton across re-renders (but created lazily per client).
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // SSR / SSG — always create a new one
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export const AppQueryProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
