import { QueryClient } from "@tanstack/react-query";

/**
 * One QueryClient per browser session (stable across re-renders). Defaults are
 * opinionated; tune per app once you have real load.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  });
}
