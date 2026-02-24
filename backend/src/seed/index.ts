import bcrypt from "bcrypt";
import { prisma } from "@/config/prisma.ts";
import { faker } from "@faker-js/faker";
import { RateLimitTier } from "@/generated/prisma/enums.ts";
import { generateTrackingId } from "@/helpers/gen-tracking.ts";

async function main() {
  console.log("[seed] Starting seeding...");

  // Clear DB
  await prisma.event.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();

  console.log("[seed] Old data cleared.");

  // create 10 users
  const users = [];
  const hashedPswd = await bcrypt.hash("password123", 10);

  for (let i = 0; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: hashedPswd,
        lastLoginAt: faker.date.recent({ days: 10 }),
        isVerified: true,
      },
    });

    users.push(user);
  }

  console.log("[seed] 10 users created.");

  // create 50 sites
  const rateTiers = [
    RateLimitTier.FREE,
    RateLimitTier.PRO,
    RateLimitTier.ENTERPRISE,
  ];

  for (let i = 0; i <= 50; i++) {
    const randomUser = faker.helpers.arrayElement(users);

    await prisma.site.create({
      data: {
        name: faker.company.name(),
        domain: faker.internet.domainName(),
        trackingId: generateTrackingId(),
        userId: randomUser?.id as string,
        rateLimitTier: faker.helpers.arrayElement(rateTiers),
        isActive: true,
      },
    });
  }

  console.log("[seed] 50 sites created.");
  console.log("[seed] seeding completed.");
}

main()
  .catch((e) => {
    console.error("[seed] Seed Failed: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
