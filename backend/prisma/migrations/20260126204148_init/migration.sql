-- CreateEnum
CREATE TYPE "RateLimitTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PAGEVIEW', 'CLICK', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "rateLimitTier" "RateLimitTier" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "eventName" TEXT,
    "url" VARCHAR(2048) NOT NULL,
    "urlHostname" VARCHAR(255) NOT NULL,
    "urlPathname" VARCHAR(1024) NOT NULL,
    "urlSearch" VARCHAR(1024),
    "pageTitle" VARCHAR(500),
    "referrer" VARCHAR(2048),
    "sessionId" UUID,
    "visitorId" UUID,
    "ipAddress" INET,
    "userAgent" VARCHAR(500),
    "deviceType" VARCHAR(20),
    "browser" VARCHAR(50) NOT NULL,
    "browserVersion" VARCHAR(20) NOT NULL,
    "os" VARCHAR(50) NOT NULL,
    "osVersion" VARCHAR(20) NOT NULL,
    "eventProperties" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_domain_key" ON "sites"("domain");

-- CreateIndex
CREATE INDEX "sites_trackingId_idx" ON "sites"("trackingId");

-- CreateIndex
CREATE INDEX "sites_userId_idx" ON "sites"("userId");

-- CreateIndex
CREATE INDEX "events_siteId_timestamp_idx" ON "events"("siteId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "events_sessionId_idx" ON "events"("sessionId");

-- CreateIndex
CREATE INDEX "events_visitorId_idx" ON "events"("visitorId");

-- CreateIndex
CREATE INDEX "events_urlPathname_siteId_idx" ON "events"("urlPathname", "siteId");

-- CreateIndex
CREATE INDEX "events_eventType_siteId_idx" ON "events"("eventType", "siteId");

-- CreateIndex
CREATE INDEX "events_receivedAt_idx" ON "events"("receivedAt");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
