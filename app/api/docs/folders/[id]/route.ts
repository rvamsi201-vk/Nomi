import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canManageFolder,
  collectDescendantFolderIds,
  deleteStoredFile,
  getOrgFolder,
} from "@/lib/docs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!canManageFolder(folder, user.id, membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const folderIds = await collectDescendantFolderIds(id);
    const files = await prisma.docFile.findMany({
      where: { folderId: { in: folderIds } },
      select: { filePath: true },
    });

    const parentId = folder.parentId;
    await prisma.docFolder.delete({ where: { id } });
    await Promise.all(files.map((file) => deleteStoredFile(file.filePath)));

    let parentSlug: string | null = null;
    if (parentId) {
      const parent = await prisma.docFolder.findUnique({
        where: { id: parentId },
        select: { slug: true },
      });
      parentSlug = parent?.slug ?? null;
    }

    return NextResponse.json({ ok: true, parentSlug });
  } catch {
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
