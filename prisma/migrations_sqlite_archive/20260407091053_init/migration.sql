-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "googleCredentials" TEXT,
    "indexNowKey" TEXT,
    "autoIndexGoogle" BOOLEAN NOT NULL DEFAULT true,
    "autoIndexNow" BOOLEAN NOT NULL DEFAULT true,
    "indexProducts" BOOLEAN NOT NULL DEFAULT true,
    "indexCollections" BOOLEAN NOT NULL DEFAULT true,
    "indexPages" BOOLEAN NOT NULL DEFAULT true,
    "indexBlogs" BOOLEAN NOT NULL DEFAULT true,
    "dailyGoogleUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'update',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE INDEX "Submission_shopId_createdAt_idx" ON "Submission"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "QueueItem_shopId_nextRetryAt_idx" ON "QueueItem"("shopId", "nextRetryAt");

-- CreateIndex
CREATE INDEX "QueueItem_engine_nextRetryAt_idx" ON "QueueItem"("engine", "nextRetryAt");
