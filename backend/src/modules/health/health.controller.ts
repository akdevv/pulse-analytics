import { prisma } from "@/config/prisma.ts";
import type { Request, Response } from "express";
import logger from "@/utils/logger.ts";
import { eventQueue } from "@/config/queue.ts";
import { redis } from "@/config/redis.ts";

export const health = async (_: Request, res: Response) => {
  const checks = {
    database: "ok" as "ok" | "error",
    redis: "ok" as "ok" | "error",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error(
      "[health] Database check failed",
      err instanceof Error ? err : new Error(String(err))
    );
    checks.database = "error";
  }

  try {
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error("Unexpected pong response");
  } catch (err) {
    logger.error(
      "[health] Redis check failed",
      err instanceof Error ? err : new Error(String(err))
    );
    checks.redis = "error";
  }

  let queueStats = { waiting: 0, active: 0, failed: 0 };
  try {
    const [waiting, active, failed] = await Promise.all([
      eventQueue.getWaitingCount(),
      eventQueue.getActiveCount(),
      eventQueue.getFailedCount(),
    ]);
    queueStats = { waiting, active, failed };
  } catch (err) {
    logger.error(
      "[health] Queue check failed",
      err instanceof Error ? err : new Error(String(err))
    );
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? "ok" : "degraded";

  // 503 so a load balancer sees the failure in the status code.
  const httpStatus = allOk ? 200 : 503;

  res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    services: checks,
    queue: queueStats,
  });
};
