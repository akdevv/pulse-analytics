import env from "./env.ts";

export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  apiVersion: "v1",
} as const;

export type Config = typeof config;
