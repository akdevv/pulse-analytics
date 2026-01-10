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

export const updateUserById = (
  id: string,
  user: Partial<IUser>
): Promise<IUser> => {
  const updateData: any = {};

  if (typeof user.name === "string" && user.name.trim() !== "") {
    updateData.name = user.name;
  }
  if (typeof user.email === "string" && user.email.trim() !== "") {
    updateData.email = user.email;
  }
  if (typeof user.password === "string" && user.password.trim() !== "") {
    updateData.password = user.password;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
};

export const updateLastLoginAt = (id: string): Promise<IUser> => {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
};
