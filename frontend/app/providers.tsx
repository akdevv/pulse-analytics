"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Analytics ranges are minutes-fresh at best; every hook was
            // repeating this. Realtime opts out with its own staleTime.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            // A 401 is handled by the client's refresh interceptor, and a 403
            // or 404 will not become true on a second try.
            retry: (failureCount, error) =>
              isAxiosError(error) &&
              (error.response?.status ?? 500) >= 500 &&
              failureCount < 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
