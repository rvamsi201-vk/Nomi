import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWeekStartKey, weekDayKeys } from "@/lib/weekly-goals";

async function getProjectForOrg(projectId: string, orgId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
    include: {
      members: { select: { userId: true } },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const project = await getProjectForOrg(id, org.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isAdmin = membership.role === "admin";
    const onProject = project.members.some((m) => m.userId === user.id);
    if (!isAdmin && !onProject) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const weekStart =
      new URL(request.url).searchParams.get("week") ?? getWeekStartKey();

    const goals = await prisma.weeklyGoal.findMany({
      where: { projectId: id, userId: user.id, weekStart },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            assignee: { select: { name: true } },
          },
        },
      },
      orderBy: { dayIndex: "asc" },
    });

    const tasks = await prisma.task.findMany({
      where: {
        projectId: id,
        ...(isAdmin ? {} : { assigneeId: user.id }),
      },
      select: {
        id: true,
        title: true,
        status: true,
        assignee: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      weekStart,
      weekDays: weekDayKeys(weekStart),
      goals,
      tasks,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const project = await getProjectForOrg(id, org.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isAdmin = membership.role === "admin";
    const onProject = project.members.some((m) => m.userId === user.id);
    if (!isAdmin && !onProject) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const weekStart = String(body.weekStart ?? getWeekStartKey());
    const dayIndex = Number(body.dayIndex);
    const taskId = body.taskId ? String(body.taskId) : null;

    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, projectId: id },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found on project" }, { status: 404 });
      }
      if (!isAdmin && task.assigneeId !== user.id) {
        return NextResponse.json(
          { error: "You can only plan tasks assigned to you" },
          { status: 403 },
        );
      }
    }

    const goal = await prisma.weeklyGoal.upsert({
      where: {
        projectId_userId_weekStart_dayIndex: {
          projectId: id,
          userId: user.id,
          weekStart,
          dayIndex,
        },
      },
      update: { taskId },
      create: {
        projectId: id,
        userId: user.id,
        weekStart,
        dayIndex,
        taskId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            assignee: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const project = await getProjectForOrg(id, org.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isAdmin = membership.role === "admin";
    const onProject = project.members.some((m) => m.userId === user.id);
    if (!isAdmin && !onProject) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const weekStart = String(body.weekStart ?? getWeekStartKey());
    const dayIndex = Number(body.dayIndex);

    await prisma.weeklyGoal.deleteMany({
      where: {
        projectId: id,
        userId: user.id,
        weekStart,
        dayIndex,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear goal" }, { status: 500 });
  }
}
