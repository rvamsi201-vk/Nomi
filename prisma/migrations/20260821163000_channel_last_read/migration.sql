-- AlterTable
ALTER TABLE "ChannelMember" ADD COLUMN "lastReadAt" DATETIME;

UPDATE "ChannelMember" SET "lastReadAt" = CURRENT_TIMESTAMP WHERE "lastReadAt" IS NULL;
