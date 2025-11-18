import env from "./env.ts";
import type { Algorithm } from "jsonwebtoken";

export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  apiVersion: "v1",

  // JWT
  jwt: {
    accessTokenSecret: env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
    accessTokenExpiresIn: env.ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRY,
    issuer: "pulse-analytics",
    algorithm: "HS256" as Algorithm,
  },
} as const;

export type Config = typeof config;
