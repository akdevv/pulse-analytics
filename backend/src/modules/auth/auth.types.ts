import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  password: z.string().nullable(),
  isVerified: z.boolean().default(false),
  lastLoginAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const registerUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export type IUser = z.infer<typeof userSchema>;
export type IUserPublic = Omit<IUser, "password" | "createdAt" | "updatedAt">;
