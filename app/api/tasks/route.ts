import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { isTaskStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isProjectMember } from "@/lib/projects";

export async function GET() {
  try {
    const { user, org, membership } = await requireMembership();
    const isAdmin = membership.role === "admin";
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          organizationId: org.id,
          ...(isAdmin ? {} : { members: { some: { userId: user.id } } }),
        },
        ...(isAdmin ? {} : { assigneeId: user.id }),
      },
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
    const { user, org, membership } = await requireMembership();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const title = String(body.title ?? "").trim();
    const status = String(body.status ?? "todo");
    const assigneeId = body.assigneeId ? String(body.assigneeId) : null;
    const isAdmin = membership.role === "admin";

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

    if (!isAdmin && !(await isProjectMember(projectId, user.id))) {
      return NextResponse.json(
        { error: "You are not a member of this project" },
        { status: 403 },
      );
    }

    if (assigneeId) {
      const onProject = await isProjectMember(projectId, assigneeId);
      if (!onProject) {
        return NextResponse.json(
          { error: "Assignee must be on this project" },
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
        createdById: user.id,
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
