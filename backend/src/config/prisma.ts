import env from "@/config/env.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString, max: 5 });
const prisma = new PrismaClient({ adapter });

export { prisma };
