-- Hand-written. `prisma migrate dev` reads the TimescaleDB objects in
-- db/migrations as drift and would reset the database, so new tables go in as
-- SQL, get applied, then are marked resolved.

CREATE TYPE "AiRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sql" TEXT,
    "rowCount" INTEGER,
    "latencyMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_userId_siteId_idx" ON "conversations"("userId", "siteId");
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
