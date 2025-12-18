import { prisma } from "@/config/prisma.ts";
import type { IUser } from "./auth.types.ts";

export const findUserByEmail = (email: string): Promise<IUser | null> => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = (
  name: string | null,
  email: string,
  password: string
): Promise<IUser> => {
  return prisma.user.create({
    data: {
      name,
      email,
      password,
      lastLoginAt: new Date(),
      isVerified: false,
    },
  });
};

export const findUserById = (id: string): Promise<IUser | null> => {
  return prisma.user.findUnique({ where: { id } });
};
