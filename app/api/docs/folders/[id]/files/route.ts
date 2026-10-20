import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgFolder, uploadsRoot, userCanAccessFolder } from "@/lib/docs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXT = new Set([
  "pdf",
  "txt",
  "md",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "zip",
  "mp3",
  "mp4",
]);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
}

export async function GET(
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
    if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = await prisma.docFile.findMany({
      where: { folderId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "Choose at least one file" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_FILES} files at once` },
        { status: 400 },
      );
    }

    const created = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "Each file must be 10MB or smaller" },
          { status: 400 },
        );
      }
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return NextResponse.json(
          { error: "That file type is not allowed" },
          { status: 400 },
        );
      }

      const storedName = `${randomUUID()}-${safeFileName(file.name)}`;
      const dir = path.join(uploadsRoot(), "docs", id);
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, storedName),
        Buffer.from(await file.arrayBuffer()),
      );

      const record = await prisma.docFile.create({
        data: {
          folderId: id,
          userId: user.id,
          fileName: file.name,
          filePath: `docs/${id}/${storedName}`,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
        include: { user: { select: { id: true, name: true } } },
      });
      created.push(record);
    }

    return NextResponse.json({ files: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
