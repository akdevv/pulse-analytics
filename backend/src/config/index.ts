import env from "./env.ts";
import type { Algorithm } from "jsonwebtoken";

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  apiVersion: "v1",

  // secrets and expiry live in env
  jwt: {
    issuer: "pulse-analytics",
    algorithm: "HS256" as Algorithm,
  },
} as const;
