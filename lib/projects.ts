import { prisma } from "@/lib/db";

export async function isProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return Boolean(member);
}

export async function ensureProjectMember(projectId: string, userId: string) {
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
}
