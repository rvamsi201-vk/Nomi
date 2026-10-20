import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

export function uploadsRoot() {
  return path.join(process.cwd(), "data", "uploads");
}

export async function getOrgFolder(folderId: string, orgId: string) {
  return prisma.docFolder.findFirst({
    where: { id: folderId, organizationId: orgId },
    include: { members: { select: { userId: true } } },
  });
}

function hasDirectAccess(
  folder: { ownerId: string; members: { userId: string }[] },
  userId: string,
) {
  if (folder.ownerId === userId) return true;
  return folder.members.some((member) => member.userId === userId);
}

export function canAccessFolder(
  folder: { ownerId: string; members: { userId: string }[] },
  userId: string,
  role: string,
) {
  if (role === "admin") return true;
  return hasDirectAccess(folder, userId);
}

/** Access if admin, direct member/owner, or member/owner of any ancestor folder. */
export async function userCanAccessFolder(
  folder: {
    id: string;
    ownerId: string;
    parentId: string | null;
    members: { userId: string }[];
  },
  userId: string,
  role: string,
) {
  if (role === "admin") return true;
  if (hasDirectAccess(folder, userId)) return true;

  let parentId = folder.parentId;
  while (parentId) {
    const parent = await prisma.docFolder.findUnique({
      where: { id: parentId },
      include: { members: { select: { userId: true } } },
    });
    if (!parent) break;
    if (hasDirectAccess(parent, userId)) return true;
    parentId = parent.parentId;
  }
  return false;
}

export function canManageFolder(
  folder: { ownerId: string },
  userId: string,
  role: string,
) {
  return role === "admin" || folder.ownerId === userId;
}

export async function collectDescendantFolderIds(rootId: string) {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.pop()!;
    const children = await prisma.docFolder.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

export async function deleteStoredFile(filePath: string) {
  const root = uploadsRoot();
  const absolute = path.join(root, filePath);
  if (!absolute.startsWith(root)) return;
  try {
    await unlink(absolute);
  } catch {
    // File may already be gone.
  }
}
