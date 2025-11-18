import { prisma } from "@/config/prisma.ts";
import type { IUser } from "./auth.types.ts";

export const findUserByEmail = (email: string): Promise<IUser | null> => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = (
  email: string,
  password: string,
  firstName: string | null,
  lastName: string | null
): Promise<IUser> => {
  return prisma.user.create({
    data: {
      email,
      password,
      firstName,
      lastName,
    },
  });
};

export const findUserById = (id: string): Promise<IUser | null> => {
  return prisma.user.findUnique({ where: { id } });
};
