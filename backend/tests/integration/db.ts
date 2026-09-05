import { prisma } from "@/config/prisma.ts";

// Runs against DATABASE_URL, the docker-compose Timescale in practice. Skips
// rather than fails when nothing answers, so `pnpm test` works with no stack up.
export const dbReachable = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};
