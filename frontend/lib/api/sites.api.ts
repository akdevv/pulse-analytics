import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CreateSiteInput,
  Site,
  UpdateSiteInput,
} from "@/lib/types/site.types";

export const createSite = (data: CreateSiteInput) =>
  apiPost<Site>("/sites", data);

export const getSites = () => apiGet<Site[]>("/sites");

export const getSiteById = (id: string) => apiGet<Site>(`/sites/${id}`);

export const updateSite = (id: string, data: UpdateSiteInput) =>
  apiPut<Site>(`/sites/${id}`, data);

export const deleteSite = (id: string) => apiDelete(`/sites/${id}`);

export const regenTrackingKey = (id: string) =>
  apiPost<Site>(`/sites/${id}/regen-key`);
