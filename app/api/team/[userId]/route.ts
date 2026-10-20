import { NextResponse } from "next/server";
import { applyRoleChannelAccess } from "@/lib/access";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { org, user: admin } = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const role = body.role === "admin" ? "admin" : "member";

    if (!userId || userId === admin.id) {
      return NextResponse.json(
        { error: "You cannot change your own role here" },
        { status: 400 },
      );
    }

    const membership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (membership.role === "admin" && role === "member") {
      const adminCount = await prisma.orgMember.count({
        where: { orgId: org.id, role: "admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Keep at least one admin in the workspace" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.orgMember.update({
      where: { orgId_userId: { orgId: org.id, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await applyRoleChannelAccess(org.id, userId, role);

    return NextResponse.json({
      id: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Only admins can change roles" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { org, user: admin } = await requireAdmin();
    const { userId } = await params;

    if (!userId || userId === admin.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 },
      );
    }

    const membership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (membership.role === "admin") {
      const adminCount = await prisma.orgMember.count({
        where: { orgId: org.id, role: "admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Keep at least one admin in the workspace" },
          { status: 400 },
        );
      }
    }

    const channels = await prisma.channel.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const projectIds = (
      await prisma.project.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      })
    ).map((p) => p.id);

    const folderIds = (
      await prisma.docFolder.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      })
    ).map((folder) => folder.id);

    await prisma.$transaction([
      prisma.channelMember.deleteMany({
        where: {
          userId,
          channelId: { in: channels.map((c) => c.id) },
        },
      }),
      prisma.projectMember.deleteMany({
        where: {
          userId,
          projectId: { in: projectIds },
        },
      }),
      prisma.docFolderMember.deleteMany({
        where: {
          userId,
          folderId: { in: folderIds },
        },
      }),
      prisma.task.updateMany({
        where: {
          assigneeId: userId,
          projectId: { in: projectIds },
        },
        data: { assigneeId: null },
      }),
      prisma.orgMember.delete({
        where: { orgId_userId: { orgId: org.id, userId } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
