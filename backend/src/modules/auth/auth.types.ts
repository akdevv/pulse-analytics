import { z } from "zod";

const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[0-9]/, "Must contain number");

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
  password,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: password.optional(),
});

export type IUser = z.infer<typeof userSchema>;
export type IUserPublic = Omit<IUser, "password" | "createdAt" | "updatedAt">;
