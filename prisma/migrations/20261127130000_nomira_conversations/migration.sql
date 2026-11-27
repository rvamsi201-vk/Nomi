-- CreateTable
CREATE TABLE "NomiraConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomiraConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomiraMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomiraMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NomiraConversation_userId_updatedAt_idx" ON "NomiraConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "NomiraMessage_conversationId_createdAt_idx" ON "NomiraMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "NomiraConversation" ADD CONSTRAINT "NomiraConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomiraMessage" ADD CONSTRAINT "NomiraMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "NomiraConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
