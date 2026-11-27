import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { runNomiraAgent } from "@/lib/nomira-agent";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

function titleFromMessage(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}…` : cleaned;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireMembership();
    const body = await request.json();
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let conversationId = body.conversationId
      ? String(body.conversationId)
      : "";

    let conversation = conversationId
      ? await prisma.nomiraConversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: {
            messages: { orderBy: { createdAt: "asc" }, take: 40 },
          },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.nomiraConversation.create({
        data: {
          userId: user.id,
          title: titleFromMessage(message),
          messages: {
            create: {
              role: "assistant",
              content:
                "Hi — I'm Nomira. Ask me about projects, tasks, or team chat. I can create tasks, update status, and post updates for you.",
            },
          },
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      conversationId = conversation.id;
    }

    const history = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await prisma.nomiraMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const result = await runNomiraAgent({
      userName: user.name,
      userMessage: message,
      history: [...history, { role: "user", content: message }],
    });

    await prisma.nomiraMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: result.text,
      },
    });

    const shouldRetitle =
      conversation.title === "New chat" ||
      conversation.messages.filter((m) => m.role === "user").length === 0;

    await prisma.nomiraConversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        ...(shouldRetitle ? { title: titleFromMessage(message) } : {}),
      },
    });

    const updated = await prisma.nomiraConversation.findUnique({
      where: { id: conversation.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      reply: result.text,
      conversationId: conversation.id,
      conversation: updated,
      engine: process.env.NOMIRA_ENGINE || "codex",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nomira failed";
    if (message === "Unauthorized" || message === "No organization") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[nomira]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireMembership();
    const { getNomiraUser } = await import("@/lib/nomira-agent");
    const nomira = await getNomiraUser();
    return NextResponse.json({
      ready: Boolean(nomira),
      engine: process.env.NOMIRA_ENGINE || "codex",
      bot: nomira
        ? { id: nomira.id, name: nomira.name, email: nomira.email }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
