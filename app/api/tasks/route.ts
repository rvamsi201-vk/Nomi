import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { isTaskStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { org } = await requireMembership();
    const tasks = await prisma.task.findMany({
      where: { project: { organizationId: org.id } },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, org } = await requireMembership();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const title = String(body.title ?? "").trim();
    const status = String(body.status ?? "todo");
    const assigneeId = body.assigneeId ? String(body.assigneeId) : null;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Project and title are required" },
        { status: 400 },
      );
    }

    if (!isTaskStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: org.id },
      include: { channel: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (assigneeId) {
      const member = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: { orgId: org.id, userId: assigneeId },
        },
      });
      if (!member) {
        return NextResponse.json(
          { error: "Assignee must be in your workspace" },
          { status: 400 },
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        status,
        assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    if (project.channelId) {
      const assigneeName = task.assignee?.name ?? "Unassigned";
      await prisma.message.create({
        data: {
          channelId: project.channelId,
          userId: user.id,
          text: `📋 Task created: ${task.title} → ${task.status.replace(/_/g, " ")} (${assigneeName})`,
        },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
