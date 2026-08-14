import api from "@/lib/api/client";
import type {
  CreateSiteInput,
  Site,
  UpdateSiteInput,
} from "@/lib/types/site.types";

type CreateSiteResponse = {
  status: string;
  message: string;
  data: {
    site: Site;
    embedCode: string;
  };
};

type GetSitesResponse = {
  status: string;
  message: string;
  data: Site[];
};

type GetSiteResponse = {
  status: string;
  message: string;
  data: Site;
};

export const createSite = async (
  data: CreateSiteInput
): Promise<CreateSiteResponse> => {
  return await api.post("/sites", data);
};

export const getSites = async (): Promise<Site[]> => {
  const res: GetSitesResponse = await api.get("/sites");
  return res.data;
};

export const getSiteById = async (id: string): Promise<Site> => {
  const res: GetSiteResponse = await api.get(`/sites/${id}`);
  return res.data;
};

export const updateSite = async (
  id: string,
  data: UpdateSiteInput
): Promise<Site> => {
  const res: GetSiteResponse = await api.put(`/sites/${id}`, data);
  return res.data;
};

export const deleteSite = async (id: string): Promise<void> => {
  await api.delete(`/sites/${id}`);
};

export const regenTrackingKey = async (id: string): Promise<Site> => {
  const res: CreateSiteResponse = await api.post(`/sites/${id}/regen-key`);
  return res.data.site;
};
