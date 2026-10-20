-- CreateTable
CREATE TABLE "DocFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocFolderMember" (
    "folderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("folderId", "userId"),
    CONSTRAINT "DocFolderMember_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFolderMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DocFolder_organizationId_slug_key" ON "DocFolder"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "DocFile_folderId_createdAt_idx" ON "DocFile"("folderId", "createdAt");
