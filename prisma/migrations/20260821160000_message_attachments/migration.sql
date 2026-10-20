-- AlterTable
ALTER TABLE "Message" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Message" ADD COLUMN "filePath" TEXT;
ALTER TABLE "Message" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Message" ADD COLUMN "sizeBytes" INTEGER;
