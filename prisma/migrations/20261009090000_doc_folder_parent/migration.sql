-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DocFolder" ("id", "organizationId", "name", "slug", "description", "ownerId", "createdAt") SELECT "id", "organizationId", "name", "slug", "description", "ownerId", "createdAt" FROM "DocFolder";
DROP TABLE "DocFolder";
ALTER TABLE "new_DocFolder" RENAME TO "DocFolder";
CREATE UNIQUE INDEX "DocFolder_organizationId_slug_key" ON "DocFolder"("organizationId", "slug");
CREATE INDEX "DocFolder_parentId_idx" ON "DocFolder"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
