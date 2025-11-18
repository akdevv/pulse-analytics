import { z } from "zod";
import type { Request } from "express";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IUser = z.infer<typeof userSchema>;
export type IUserPublic = Omit<IUser, "password">;
