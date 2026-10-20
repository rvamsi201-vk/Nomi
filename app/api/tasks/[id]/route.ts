import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { isTaskStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isProjectMember } from "@/lib/projects";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const body = await request.json();
    const isAdmin = membership.role === "admin";

    const existing = await prisma.task.findFirst({
      where: { id, project: { organizationId: org.id } },
      include: {
        project: { include: { channel: true } },
        assignee: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!isAdmin && existing.assigneeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextStatus =
      body.status !== undefined ? String(body.status) : undefined;
    if (nextStatus !== undefined && !isTaskStatus(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (body.assigneeId) {
      const onProject = await isProjectMember(
        existing.projectId,
        String(body.assigneeId),
      );
      if (!onProject) {
        return NextResponse.json(
          { error: "Assignee must be on this project" },
          { status: 400 },
        );
      }
    }

    const statusChanged =
      nextStatus !== undefined && nextStatus !== existing.status;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        status: nextStatus,
        ...(statusChanged ? { statusUpdatedAt: new Date() } : {}),
        assigneeId:
          body.assigneeId === undefined
            ? undefined
            : body.assigneeId
              ? String(body.assigneeId)
              : null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    if (existing.project.channelId && statusChanged) {
      const assigneeName = task.assignee?.name ?? "Unassigned";
      await prisma.message.create({
        data: {
          channelId: existing.project.channelId,
          userId: user.id,
          text: `📋 ${task.title} → ${task.status.replace(/_/g, " ")} (${assigneeName})`,
        },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const isAdmin = membership.role === "admin";

    const existing = await prisma.task.findFirst({
      where: { id, project: { organizationId: org.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!isAdmin && !(await isProjectMember(existing.projectId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin && existing.assigneeId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete tasks assigned to you" },
        { status: 403 },
      );
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
