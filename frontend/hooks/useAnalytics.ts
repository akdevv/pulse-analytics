import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getCustomEvents,
  getDevices,
  getEventProperties,
  getGeo,
  getOverview,
  getReferrers,
  getTimeseries,
  getTopPages,
} from "@/lib/api/analytics.api";
import { getAccessToken } from "@/lib/api/client";
import type {
  DateRangeParams,
  RealtimeStats,
} from "@/lib/types/analytics.types";

const RECONNECT_MS = 5_000;

function useRangeQuery<T>(
  key: string,
  fetcher: (siteId: string, params: DateRangeParams) => Promise<T>,
  siteId: string,
  params: DateRangeParams
) {
  const { from, to, interval, limit } = params;
  return useQuery({
    queryKey: [key, siteId, from, to, interval, limit],
    queryFn: () => fetcher(siteId, params),
    enabled: !!siteId,
  });
}

export const useOverview = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("overview", getOverview, siteId, params);

export const useTimeseries = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("timeseries", getTimeseries, siteId, params);

export const useTopPages = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("top-pages", getTopPages, siteId, params);

export const useReferrers = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("referrers", getReferrers, siteId, params);

export const useDevices = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("devices", getDevices, siteId, params);

export const useGeo = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("geo", getGeo, siteId, params);

export const useCustomEvents = (siteId: string, params: DateRangeParams) =>
  useRangeQuery("custom-events", getCustomEvents, siteId, params);

export function useEventProperties(
  siteId: string,
  name: string | null,
  params: DateRangeParams
) {
  return useQuery({
    queryKey: ["event-properties", siteId, name, params.from, params.to],
    queryFn: () => getEventProperties(siteId, name!, params),
    enabled: !!siteId && !!name,
  });
}

export function useRealtimeStream(siteId: string) {
  const [data, setData] = useState<RealtimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!siteId) return;

    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/${siteId}/realtime/stream`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${getAccessToken()}`,
              Accept: "text/event-stream",
            },
          }
        );
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let buf = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += value;
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const frame = JSON.parse(line.slice(6));
              if (frame.status !== "success") continue;
              setData(frame.data as RealtimeStats);
              setError(null);
              setIsLoading(false);
            } catch {
              // Skip malformed frames.
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err as Error);
        setIsLoading(false);
      }
      if (!controller.signal.aborted) retry = setTimeout(connect, RECONNECT_MS);
    }

    connect();

    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [siteId]);

  return { data, isLoading, error };
}
