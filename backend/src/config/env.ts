import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  ACCESS_TOKEN_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY: z.string().default("30d"),

  DATABASE_URL: z.string().min(1),
  AI_DATABASE_URL: z.string().optional(),

  // Any OpenAI-compatible /chat/completions endpoint. No AI_API_KEY means the
  // AI feature is off and the rest of the API still boots.
  AI_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("openai/gpt-oss-120b"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Unset follows NODE_ENV (see the default export). The preprocess is needed
  // because an empty value in .env arrives as "" and would fail the enum.
  RATE_LIMIT_ENABLED: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["true", "false"]).optional()
    )
    .transform((v) => (v === undefined ? undefined : v === "true")),

  GEOIP_DB_PATH: z.string().default("./data/GeoLite2-City.mmdb"),

  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment variables:\n",
    z.prettifyError(parsed.error)
  );
  process.exit(1);
}

export default {
  ...parsed.data,
  RATE_LIMIT_ENABLED:
    parsed.data.RATE_LIMIT_ENABLED ?? parsed.data.NODE_ENV !== "development",
};
