import env from "./env.ts";
import type { Algorithm } from "jsonwebtoken";

export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  apiVersion: "v1",

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "pulse-analytics",
    algorithm: "HS256" as Algorithm,
  },
} as const;

export type Config = typeof config;
