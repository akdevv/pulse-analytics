import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { config } from "@/config/index.ts";
import env from "@/config/env.ts";
import { redis } from "@/config/redis.ts";
import type { IUserPublic } from "./auth.types.ts";
import {
  findUserByEmail,
  createUser,
  findUserById,
  updateUserById,
  updateLastLoginAt,
} from "./auth.repository.ts";
import { AppError } from "@/utils/app-error.ts";

// A real cost-12 hash of a value nothing can supply. Only ever compared against.
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.uCLFn6nDVLNIYSVQrRWt/A9k9jXhQnO";

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
    throw AppError.validation("Email and password are required");
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw AppError.alreadyExists("User");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await createUser(name, email, hashedPassword);

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
    throw AppError.validation("Email and password are required");
  }

  // One answer for "no such user" and "wrong password". The dummy hash keeps
  // the timing equal too, since skipping bcrypt would return far faster.
  const userData = await findUserByEmail(email);
  const isPasswordValid = await bcrypt.compare(
    password,
    userData?.password ?? DUMMY_HASH
  );

  if (!userData || !isPasswordValid) {
    throw AppError.unauthorized("Invalid email or password");
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
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
    issuer: config.jwt.issuer,
    algorithms: [config.jwt.algorithm],
  }) as {
    userId: string;
    email: string;
    jti?: string;
  };

  // Refresh checks the denylist too, or logout would only stop access tokens.
  if (payload.jti && (await redis.exists(`denylist:${payload.jti}`))) {
    throw AppError.unauthorized("Token revoked");
  }

  const newAccessToken = jwt.sign(
    { userId: payload.userId, email: payload.email, jti: randomUUID() },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRY as string,
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
    throw AppError.notFound("User");
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
    const hashedPassword = await bcrypt.hash(user.password, 12);
    updateData.password = hashedPassword;
  }

  if (Object.keys(updateData).length === 0) {
    throw AppError.validation(
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
    { userId, email, jti: randomUUID() },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRY as string,
      issuer: config.jwt.issuer,
      algorithm: config.jwt.algorithm,
    } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, email, jti: randomUUID() },
    env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRY as string,
      issuer: config.jwt.issuer,
      algorithm: config.jwt.algorithm,
    } as SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};
