-- CreateTable
CREATE TABLE "WeeklyGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "taskId" TEXT,
    CONSTRAINT "WeeklyGoal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyGoal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyGoal_projectId_userId_weekStart_dayIndex_key" ON "WeeklyGoal"("projectId", "userId", "weekStart", "dayIndex");
CREATE INDEX "WeeklyGoal_projectId_weekStart_idx" ON "WeeklyGoal"("projectId", "weekStart");
