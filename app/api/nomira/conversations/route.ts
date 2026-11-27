import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { user } = await requireMembership();
    const conversations = await prisma.nomiraConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(conversations);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireMembership();
    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? "New chat").trim() || "New chat";
    const conversation = await prisma.nomiraConversation.create({
      data: {
        userId: user.id,
        title,
        messages: {
          create: {
            role: "assistant",
            content:
              "Hi — I'm Nomira. Ask me about projects, tasks, or team chat. I can create tasks, update status, and post updates for you.",
          },
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
