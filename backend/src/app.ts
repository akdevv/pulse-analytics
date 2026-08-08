// import "@/config/redis.ts";
// import cors from "cors";
import helmet from "helmet";
import express, { type Express } from "express";
import { config } from "@/config/index.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@/middleware/error.middleware.ts";
import { requestId } from "@/middleware/request-id.ts";
// import env from "@/config/env.ts";

// Routes
import healthRoutes from "@/modules/health/health.routes.ts";

const app: Express = express();
const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

// Open CORS for /track — must accept requests from any website
// const openCors = cors({
//   origin: "*",
//   methods: ["POST"],
//   allowedHeaders: ["Content-Type"],
// });

// // Restrictive CORS for all other routes — only our frontend
// const restrictedCors = cors({
//   origin: env.FRONTEND_URL,
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// });

app.use(requestId);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);
app.set("json replacer", jsonReplacer);

const apiRoute = express.Router();

// Routes
apiRoute.use("/health", healthRoutes);

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
