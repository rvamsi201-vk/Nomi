import { NextResponse } from "next/server";
import { syncProjectChannelMembers } from "@/lib/access";
import { requireAdmin, requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isProjectMember } from "@/lib/projects";

async function getOrgProject(projectId: string, orgId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const project = await getOrgProject(id, org.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isAdmin = membership.role === "admin";
    if (!isAdmin && !(await isProjectMember(id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { org } = await requireAdmin();
    const { id } = await params;
    const project = await getOrgProject(id, org.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const rawIds = Array.isArray(body.memberIds) ? body.memberIds : null;
    if (!rawIds || rawIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one project member" },
        { status: 400 },
      );
    }

    const requestedIds: string[] = Array.from(
      new Set<string>(rawIds.map((value: unknown) => String(value))),
    );

    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      select: { userId: true },
    });
    const orgUserIds = new Set(orgMembers.map((m) => m.userId));

    const outsideOrg = requestedIds.filter((id) => !orgUserIds.has(id));
    if (outsideOrg.length > 0) {
      return NextResponse.json(
        { error: "Every member must belong to this workspace" },
        { status: 400 },
      );
    }

    const nextMemberIds = Array.from(
      new Set<string>(
        [...requestedIds, project.ownerId].filter((id) => orgUserIds.has(id)),
      ),
    );
    if (nextMemberIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one project member" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.projectMember.deleteMany({
        where: {
          projectId: id,
          userId: { notIn: nextMemberIds },
        },
      }),
      ...nextMemberIds.map((userId) =>
        prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: id, userId } },
          update: {},
          create: { projectId: id, userId },
        }),
      ),
    ]);

    await syncProjectChannelMembers(id);

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
