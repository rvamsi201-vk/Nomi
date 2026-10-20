-- CreateTable
CREATE TABLE "StickyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'butter',
    "x" REAL NOT NULL DEFAULT 40,
    "y" REAL NOT NULL DEFAULT 40,
    "zIndex" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StickyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StickyNote_userId_dateKey_idx" ON "StickyNote"("userId", "dateKey");
