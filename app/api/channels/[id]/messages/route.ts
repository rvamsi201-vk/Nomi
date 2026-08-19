import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after");

    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const text = String(body.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: { channelId: id, userId: user.id, text },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
