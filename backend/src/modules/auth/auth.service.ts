import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "@/config/index.ts";
import type { IUserPublic } from "./auth.types.ts";
import {
  findUserByEmail,
  createUser,
  findUserById,
  updateUserById,
  updateLastLoginAt,
} from "./auth.repository.ts";
import { AppError } from "@/utils/app-error.ts";

interface RegisterUser {
  email: string;
  password: string;
  name: string;
}

export const registerUser = async (
  user: RegisterUser
): Promise<{ accessToken: string; refreshToken: string }> => {
  const { name, email, password } = user;
  if (!email || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await createUser(name, email, hashedPassword);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(
    newUser.id,
    newUser.email
  );
  return { accessToken, refreshToken };
};

export const loginUser = async (user: {
  email: string;
  password: string;
}): Promise<{ accessToken: string; refreshToken: string }> => {
  const { email, password } = user;
  if (!email || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const userData = await findUserByEmail(email);
  if (!userData) {
    throw new AppError(400, "Failed to login user");
  }

  const isPasswordValid = await bcrypt.compare(password, userData.password!);
  if (!isPasswordValid) {
    throw new AppError(400, "Failed to login user");
  }

  const { accessToken, refreshToken } = generateTokens(
    userData.id,
    userData.email
  );

  await updateLastLoginAt(userData.id);
  return { accessToken, refreshToken };
};

export const refreshTokenService = async (
  token: string
): Promise<{ accessToken: string }> => {
  const payload = jwt.verify(token, config.jwt.refreshTokenSecret) as {
    userId: string;
    email: string;
  };

  const newAccessToken = jwt.sign(
    { userId: payload.userId, email: payload.email },
    config.jwt.accessTokenSecret,
    {
      expiresIn: config.jwt.accessTokenExpiresIn as string,
      issuer: config.jwt.issuer,
      algorithm: config.jwt.algorithm,
    } as SignOptions
  );

  return { accessToken: newAccessToken };
};

export const getUserById = async (id: string): Promise<IUserPublic | null> => {
  const user = await findUserById(id);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt,
  };
};

export const updateUserService = async (
  id: string,
  user: {
    name?: string;
    email?: string;
    password?: string;
  }
): Promise<IUserPublic> => {
  const userData = await findUserById(id);
  if (!userData) {
    throw new AppError(404, "User not found");
  }

  const updateData: {
    name?: string;
    email?: string;
    password?: string;
  } = {};

  if (user.name !== undefined) {
    updateData.name = user.name;
  }

  if (user.email !== undefined) {
    updateData.email = user.email;
  }

  if (user.password !== undefined) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    updateData.password = hashedPassword;
  }

  // Check if at least one field is provided
  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      400,
      "At least one field (name, email, or password) must be provided"
    );
  }

  const updatedUser = await updateUserById(id, updateData);

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    isVerified: updatedUser.isVerified,
    lastLoginAt: updatedUser.lastLoginAt,
  };
};

const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign(
    { userId, email },
    config.jwt.accessTokenSecret,
    {
      expiresIn: config.jwt.accessTokenExpiresIn as string,
      issuer: config.jwt.issuer,
      algorithm: config.jwt.algorithm,
    } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, email },
    config.jwt.refreshTokenSecret,
    {
      expiresIn: config.jwt.refreshTokenExpiresIn as string,
      issuer: config.jwt.issuer,
      algorithm: config.jwt.algorithm,
    } as SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};
