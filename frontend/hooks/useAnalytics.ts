import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  getOverview,
  getTimeseries,
  getTopPages,
  getReferrers,
  getDevices,
  getGeo,
  getRealtime,
  getRawEvents,
  runRawQuery,
  getCustomEvents,
  getEventProperties,
} from "@/lib/api/analytics.api";
import { getAccessToken } from "@/lib/api/client";
import type {
  DateRangeParams,
  RealtimeStats,
} from "@/lib/types/analytics.types";

export function useOverview(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["overview", siteId, params.from, params.to],
    queryFn: () => getOverview(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useTimeseries(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["timeseries", siteId, params.from, params.to, params.interval],
    queryFn: () => getTimeseries(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useTopPages(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["top-pages", siteId, params.from, params.to, params.limit],
    queryFn: () => getTopPages(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useReferrers(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["referrers", siteId, params.from, params.to, params.limit],
    queryFn: () => getReferrers(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useDevices(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["devices", siteId, params.from, params.to],
    queryFn: () => getDevices(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useGeo(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["geo", siteId, params.from, params.to],
    queryFn: () => getGeo(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

export function useCustomEvents(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["custom-events", siteId, params.from, params.to, params.limit],
    queryFn: () => getCustomEvents(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}

/** Only fires once a row is selected — the breakdown is a click-to-expand. */
export function useEventProperties(
  siteId: string,
  name: string | null,
  params: DateRangeParams
) {
  return useQuery({
    queryKey: ["event-properties", siteId, name, params.from, params.to],
    queryFn: () => getEventProperties(siteId, name!, params),
    staleTime: 60_000,
    enabled: !!siteId && !!name,
  });
}

export function useRealtime(siteId: string) {
  return useQuery({
    queryKey: ["realtime", siteId],
    queryFn: () => getRealtime(siteId),
    refetchInterval: 30_000,
    staleTime: 0,
    enabled: !!siteId,
  });
}

export function useRealtimeStream(siteId: string) {
  const [data, setData] = useState<RealtimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!siteId) return;

    let retryTimeout: ReturnType<typeof setTimeout>;

    async function connect() {
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      try {
        const token = getAccessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/${siteId}/realtime/stream`,
          {
            signal,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "text/event-stream",
            },
          }
        );

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.status === "success") {
                setData(parsed.data as RealtimeStats);
                setIsLoading(false);
                setError(null);
              }
            } catch {
              // malformed SSE frame — skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err as Error);
        setIsLoading(false);
        // reconnect after 5s on error
        retryTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      abortRef.current?.abort();
      clearTimeout(retryTimeout);
    };
  }, [siteId]);

  return { data, isLoading, error };
}

export function useRawEvents(siteId: string) {
  return useQuery({
    queryKey: ["raw-events", siteId],
    queryFn: () => getRawEvents(siteId),
    refetchInterval: 30_000,
    staleTime: 0,
    enabled: !!siteId,
  });
}

export function useRawQuery(siteId: string, query: string) {
  return useQuery({
    queryKey: ["raw-query", siteId, query],
    queryFn: () => runRawQuery(siteId, query),
    enabled: false,
    staleTime: 0,
  });
}
