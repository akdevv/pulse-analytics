import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IUser = z.infer<typeof userSchema>;
export type IUserPublic = Omit<IUser, "password">;
