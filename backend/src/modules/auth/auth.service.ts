import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "@/config/index.ts";
import type { IUserPublic } from "./auth.types.ts";
import {
  findUserByEmail,
  createUser,
  findUserById,
} from "./auth.repository.ts";

interface RegisterUser {
  email: string;
  password: string;
  name: string;
}

export const registerUser = async (
  user: RegisterUser
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const { name, email, password } = user;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(name, email, hashedPassword);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      config.jwt.accessTokenSecret,
      {
        expiresIn: config.jwt.accessTokenExpiresIn as string,
        issuer: config.jwt.issuer,
        algorithm: config.jwt.algorithm,
      } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
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
  } catch (error) {
    throw new Error("Failed to register user: " + error);
  }
};

export const getUserById = async (id: string): Promise<IUserPublic | null> => {
  try {
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
  } catch (error) {
    throw new Error("Failed to get user by id: " + error);
  }
};
