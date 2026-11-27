import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { isTaskStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { MAX_PASTED_TASKS } from "@/lib/parse-task-list";
import { isProjectMember } from "@/lib/projects";

export async function POST(request: Request) {
  try {
    const { user, org, membership } = await requireMembership();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const status = String(body.status ?? "todo");
    const isAdmin = membership.role === "admin";

    const rawTitles = Array.isArray(body.titles) ? body.titles : [];
    const titles = rawTitles
      .map((t: unknown) => String(t ?? "").trim())
      .filter((t: string) => t.length > 0);

    if (!projectId) {
      return NextResponse.json({ error: "Project is required" }, { status: 400 });
    }

    if (titles.length === 0) {
      return NextResponse.json(
        { error: "At least one task title is required" },
        { status: 400 },
      );
    }

    if (titles.length > MAX_PASTED_TASKS) {
      return NextResponse.json(
        { error: `At most ${MAX_PASTED_TASKS} tasks can be added at once` },
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

    const result = await prisma.task.createMany({
      data: titles.map((title: string) => ({
        projectId,
        title,
        status,
        assigneeId: null,
        createdById: user.id,
      })),
    });

    if (project.channelId) {
      const statusLabel = status.replace(/_/g, " ");
      await prisma.message.create({
        data: {
          channelId: project.channelId,
          userId: user.id,
          text: `📋 ${result.count} tasks created in ${statusLabel}`,
        },
      });
    }

    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create tasks" },
      { status: 500 },
    );
  }
}
