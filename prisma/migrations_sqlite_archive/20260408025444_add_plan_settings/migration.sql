-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
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
    "plan" TEXT NOT NULL DEFAULT 'free',
    "settings" TEXT,
    "dailyGoogleUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("autoIndexGoogle", "autoIndexNow", "createdAt", "dailyGoogleUsed", "domain", "googleCredentials", "id", "indexBlogs", "indexCollections", "indexNowKey", "indexPages", "indexProducts", "quotaResetAt", "updatedAt") SELECT "autoIndexGoogle", "autoIndexNow", "createdAt", "dailyGoogleUsed", "domain", "googleCredentials", "id", "indexBlogs", "indexCollections", "indexNowKey", "indexPages", "indexProducts", "quotaResetAt", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
