import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "@/config/index.ts";
import type { IUser } from "./auth.types.ts";
import { findUserByEmail, createUser } from "./user.repository.ts";

interface IRegisterUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const generateJWT = (user: IUser) => {
  const options: SignOptions = {
    expiresIn: Number(config.jwt.expiresIn),
    issuer: config.jwt.issuer,
    algorithm: config.jwt.algorithm,
  };

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    config.jwt.secret,
    options
  );
};

export const registerUser = async (user: IRegisterUser) => {
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
    const token = generateJWT(newUser);
  } catch (error) {}
};
