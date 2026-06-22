import { QueryClient } from "@tanstack/react-query";

/** One QueryClient per browser session. Tune defaults per app once you have load. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}
