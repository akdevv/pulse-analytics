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

// Routes
import analyticsRoutes from "@/modules/analytics/analytics.routes.ts";
import authRoutes from "@/modules/auth/auth.routes.ts";
import healthRoutes from "@/modules/health/health.routes.ts";
import siteRoutes from "@/modules/site/site.routes.ts";
import trackRoutes from "@/modules/ingestion/track.routes.ts";

const app: Express = express();
const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

// Open CORS for /track — must accept requests from any website
const openCors = cors({
  origin: "*",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
});

// Restrictive CORS for all other routes — only our frontend
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
app.set("trust proxy", 1);
app.set("json replacer", jsonReplacer);

// Browser SDK — served from the API host so any site can <script src> it.
// GET only, and the same open CORS as /track since it loads cross-origin.
app.use(
  express.static(path.join(import.meta.dirname, "../public"), {
    setHeaders: (res) => res.setHeader("Access-Control-Allow-Origin", "*"),
  }),
);

const apiRoute = express.Router();

// Routes
apiRoute.use("/analytics", restrictedCors, analyticsRoutes);
apiRoute.use("/auth", restrictedCors, authRoutes);
apiRoute.use("/health", healthRoutes);
apiRoute.use("/sites", restrictedCors, siteRoutes);
apiRoute.use("/track", openCors, trackRoutes);

// Mount API routes
app.use(`/api/${config.apiVersion}`, apiRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.path,
  });
});

// Error handler
app.use(errorMiddleware);

export default app;
