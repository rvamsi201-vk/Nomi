import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canManageFolder,
  deleteStoredFile,
  getOrgFolder,
  uploadsRoot,
  userCanAccessFolder,
} from "@/lib/docs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id, fileId } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await prisma.docFile.findFirst({
      where: { id: fileId, folderId: id },
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const root = uploadsRoot();
    const absolute = path.join(root, file.filePath);
    if (!absolute.startsWith(root)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const data = await readFile(absolute);
    const downloadName = file.fileName.replace(/"/g, "");
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${downloadName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id, fileId } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await prisma.docFile.findFirst({
      where: { id: fileId, folderId: id },
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const canDelete =
      canManageFolder(folder, user.id, membership.role) ||
      file.userId === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.docFile.delete({ where: { id: fileId } });
    await deleteStoredFile(file.filePath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
