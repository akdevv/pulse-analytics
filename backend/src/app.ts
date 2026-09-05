import "@/config/redis.ts";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import express, { type Express } from "express";
import { config } from "@/config/index.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@/middleware/error.middleware.ts";
import { requestId } from "@/middleware/request-id.ts";
import env from "@/config/env.ts";

import aiRoutes from "@/modules/ai/ai.routes.ts";
import analyticsRoutes from "@/modules/analytics/analytics.routes.ts";
import authRoutes from "@/modules/auth/auth.routes.ts";
import healthRoutes from "@/modules/health/health.routes.ts";
import siteRoutes from "@/modules/site/site.routes.ts";
import trackRoutes from "@/modules/ingestion/track.routes.ts";

const app: Express = express();
const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

// /track must accept requests from any website.
const openCors = cors({
  origin: "*",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
});

const restrictedCors = cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.use(requestId);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// One hop, our load balancer. extractClientIp relies on this to skip the
// X-Forwarded-For entries a client prepended.
app.set("trust proxy", 1);
app.set("json replacer", jsonReplacer);

// The browser SDK, served from the API host so any site can <script src> it.
app.use(
  express.static(path.join(import.meta.dirname, "../public"), {
    setHeaders: (res) => res.setHeader("Access-Control-Allow-Origin", "*"),
  }),
);

const apiRoute = express.Router();

apiRoute.use("/ai", restrictedCors, aiRoutes);
apiRoute.use("/analytics", restrictedCors, analyticsRoutes);
apiRoute.use("/auth", restrictedCors, authRoutes);
apiRoute.use("/health", healthRoutes);
apiRoute.use("/sites", restrictedCors, siteRoutes);
apiRoute.use("/track", openCors, trackRoutes);

app.use(`/api/${config.apiVersion}`, apiRoute);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.path,
  });
});

app.use(errorMiddleware);

export default app;
