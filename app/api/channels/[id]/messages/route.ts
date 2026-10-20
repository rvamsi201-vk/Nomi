import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureChannelReadRow, userCanAccessChannel } from "@/lib/access";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  "mp3",
  "mp4",
]);

async function requireChannelAccess(
  channelId: string,
  userId: string,
  orgId: string,
  role: string,
) {
  return userCanAccessChannel(channelId, userId, orgId, role);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
}

async function storeFile(channelId: string, file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("FILE_TYPE");
  }
  const storedName = `${randomUUID()}-${safeFileName(file.name)}`;
  const dir = path.join(process.cwd(), "data", "uploads", "chat", channelId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));
  return {
    fileName: file.name,
    filePath: path.join("chat", channelId, storedName),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    if (!(await requireChannelAccess(id, user.id, org.id, membership.role))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }
    const after = new URL(request.url).searchParams.get("after");
    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
        ...(membership.role === "admin"
          ? {}
          : { NOT: { text: { startsWith: "📋" } } }),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    if (!(await requireChannelAccess(id, user.id, org.id, membership.role))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }
    await ensureChannelReadRow(id, user.id);

    const contentType = request.headers.get("content-type") ?? "";
    let text = "";
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      text = String(form.get("text") ?? "").trim();
      const multi = form
        .getAll("files")
        .filter((item): item is File => item instanceof File && item.size > 0);
      const single = form.get("file");
      if (single instanceof File && single.size > 0) {
        files = [single, ...multi];
      } else {
        files = multi;
      }
    } else {
      const body = await request.json();
      text = String(body.text ?? "").trim();
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can attach up to ${MAX_FILES} files at once` },
        { status: 400 },
      );
    }

    if (files.length === 0 && !text) {
      return NextResponse.json({ error: "Message or document required" }, { status: 400 });
    }

    const created = [];

    if (files.length === 0) {
      const message = await prisma.message.create({
        data: { channelId: id, userId: user.id, text },
        include: { user: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ messages: [message] }, { status: 201 });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let stored;
      try {
        stored = await storeFile(id, file);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "FILE_TOO_LARGE") {
          return NextResponse.json({ error: "Each file must be 10MB or smaller" }, { status: 400 });
        }
        if (code === "FILE_TYPE") {
          return NextResponse.json({ error: "One of those file types is not allowed" }, { status: 400 });
        }
        throw error;
      }

      const message = await prisma.message.create({
        data: {
          channelId: id,
          userId: user.id,
          text: i === 0 && text ? text : `Shared ${stored.fileName}`,
          ...stored,
        },
        include: { user: { select: { id: true, name: true } } },
      });
      created.push(message);
    }

    return NextResponse.json({ messages: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
