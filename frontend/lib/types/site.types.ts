export type RateLimitTier = "FREE" | "PRO" | "ENTERPRISE";

export type Site = {
  id: string;
  name: string;
  domain: string;
  userId: string;
  trackingId: string;
  rateLimitTier: RateLimitTier;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSiteInput = {
  name: string;
  domain: string;
};

export type UpdateSiteInput = {
  name?: string;
  domain?: string;
};

export type CreateSiteResponse = {
  status: string;
  message: string;
  data: {
    site: Site;
    embedCode: string;
  };
};
