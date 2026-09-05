import http from "http";
import app from "@/app.ts";
import { config } from "@/config/index.ts";
import { prisma } from "@/config/prisma.ts";
import { redis } from "@/config/redis.ts";
import logger from "@/utils/logger.ts";
import { closeAiPool } from "@/modules/ai/ai.runner.ts";

async function main() {
  const server = http.createServer(app);

  const shutdown = async () => {
    logger.info("[server] Shutting down...");
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      await closeAiPool();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
  });
}

main();
