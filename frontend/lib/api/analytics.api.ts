import api from "@/lib/api/client";

export type DateRangeParams = {
  from: string;
  to: string;
  interval?: "hour" | "day";
};

export const getOverview = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/overview`, { params });
};
