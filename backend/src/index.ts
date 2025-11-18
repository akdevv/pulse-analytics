import http from "http";
import app from "@/app.ts";
import { config } from "@/config/index.ts";
import logger from "@/utils/logger.ts";

async function main() {
  const server = http.createServer(app);
  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
  });
}

main();
