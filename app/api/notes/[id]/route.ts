import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

const COLORS = new Set(["butter", "mint", "blush", "sky", "lilac"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireMembership();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.stickyNote.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const data: {
      body?: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      zIndex?: number;
    } = {};

    if (body.body !== undefined) {
      data.body = String(body.body).slice(0, 8000);
    }
    if (body.color !== undefined && COLORS.has(String(body.color))) {
      data.color = String(body.color);
    }
    if (body.x !== undefined && Number.isFinite(Number(body.x))) {
      data.x = Math.max(0, Number(body.x));
    }
    if (body.y !== undefined && Number.isFinite(Number(body.y))) {
      data.y = Math.max(0, Number(body.y));
    }
    if (body.width !== undefined && Number.isFinite(Number(body.width))) {
      data.width = Math.max(180, Math.min(560, Number(body.width)));
    }
    if (body.height !== undefined && Number.isFinite(Number(body.height))) {
      data.height = Math.max(150, Math.min(560, Number(body.height)));
    }
    if (body.bringToFront) {
      const top = await prisma.stickyNote.findFirst({
        where: { userId: user.id, dateKey: existing.dateKey },
        orderBy: { zIndex: "desc" },
        select: { zIndex: true },
      });
      data.zIndex = (top?.zIndex ?? existing.zIndex) + 1;
    }

    const note = await prisma.stickyNote.update({
      where: { id },
      data,
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireMembership();
    const { id } = await params;

    const existing = await prisma.stickyNote.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.stickyNote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
