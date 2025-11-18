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
  firstName: string | null;
  lastName: string | null;
}

export const registerUser = async (
  user: RegisterUser
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const { email, password, firstName, lastName } = user;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(
      email,
      hashedPassword,
      firstName,
      lastName
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      config.jwt.accessTokenSecret,
      {
        expiresIn: Number(config.jwt.accessTokenExpiresIn),
        issuer: config.jwt.issuer,
        algorithm: config.jwt.algorithm,
      } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      config.jwt.refreshTokenSecret,
      {
        expiresIn: Number(config.jwt.refreshTokenExpiresIn),
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    throw new Error("Failed to get user by id: " + error);
  }
};
