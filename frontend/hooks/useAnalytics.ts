import { useQuery } from "@tanstack/react-query";
import {
  getOverview,
  getTimeseries,
  getTopPages,
  getReferrers,
  getDevices,
  getGeo,
  getRealtime,
} from "@/lib/api/analytics.api";
import type { DateRangeParams } from "@/lib/types/analytics.types";

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

export function useRealtime(siteId: string) {
  return useQuery({
    queryKey: ["realtime", siteId],
    queryFn: () => getRealtime(siteId),
    refetchInterval: 30_000,
    staleTime: 0,
    enabled: !!siteId,
  });
}
