import { DateRangeParams, getOverview } from "@/lib/api/analytics.api";
import { useQuery } from "@tanstack/react-query";

export function useOverview(siteId: string, params: DateRangeParams) {
  return useQuery({
    queryKey: ["overview", siteId, params.from, params.to],
    queryFn: () => getOverview(siteId, params),
    staleTime: 60_000,
    enabled: !!siteId,
  });
}
