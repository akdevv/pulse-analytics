import api from "@/lib/api/client";
import type {
  CreateSiteInput,
  CreateSiteResponse,
} from "@/lib/types/site.types";

export const createSite = async (
  data: CreateSiteInput,
): Promise<CreateSiteResponse> => {
  return await api.post("/sites", data);
};
