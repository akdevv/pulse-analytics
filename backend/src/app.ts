import cors from "cors";
import helmet from "helmet";
import express, { type Express } from "express";
import { config } from "@/config/index.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "@/middleware/error.middleware.ts";

// Routes
import authRoutes from "@/modules/auth/auth.routes.ts";
import siteRoutes from "@/modules/site/site.routes.ts";

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoute = express.Router();

// Health check
apiRoute.get("/health", (_, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Routes
apiRoute.use("/auth", authRoutes);
apiRoute.use("/sites", siteRoutes);

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
