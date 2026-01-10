import { z } from "zod";

export const siteSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100),
  domain: z.string().min(2).max(100),
  user_id: z.string(),
  tracking_id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createSiteSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine(
      (v) => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v),
      {
        message: "Invalid domain format",
      }
    ),
});

export const updateSiteSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine(
      (v) => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v),
      {
        message: "Invalid domain format",
      }
    )
    .optional(),
});

export type ISite = z.infer<typeof siteSchema>;
