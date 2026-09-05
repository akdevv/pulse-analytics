import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSite,
  deleteSite,
  getSiteById,
  getSites,
  regenTrackingKey,
  updateSite,
} from "@/lib/api/sites.api";
import type { Site, UpdateSiteInput } from "@/lib/types/site.types";

export function useSites() {
  return useQuery({ queryKey: ["sites"], queryFn: getSites });
}

/** The site header, settings and setup pages all want the same site; one
    query key means one request between them. */
export function useSite(id: string) {
  return useQuery({
    queryKey: ["site", id],
    queryFn: () => getSiteById(id),
    enabled: !!id,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useUpdateSite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSiteInput) => updateSite(id, data),
    onSuccess: (site) => {
      queryClient.setQueryData<Site>(["site", id], site);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useRegenTrackingKey(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenTrackingKey(id),
    onSuccess: (site) => {
      queryClient.setQueryData<Site>(["site", id], site);
    },
  });
}

export function useDeleteSite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteSite(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["site", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}
