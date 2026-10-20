import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { userCanAccessChannel } from "@/lib/access";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id, messageId } = await params;
    if (!(await userCanAccessChannel(id, user.id, org.id, membership.role))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId: id },
    });
    if (!message?.filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const uploadsRoot = path.join(process.cwd(), "data", "uploads");
    const absolute = path.join(uploadsRoot, message.filePath);
    if (!absolute.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const data = await readFile(absolute);
    const downloadName = (message.fileName ?? "file").replace(/"/g, "");
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": message.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${downloadName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
