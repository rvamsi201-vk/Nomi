import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFolder, getOrgFolder, userCanAccessFolder } from "@/lib/docs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.docFolderMember.findMany({
      where: { folderId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json(
      members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
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
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    const folder = await getOrgFolder(id, org.id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (!canManageFolder(folder, user.id, membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (folder.parentId) {
      return NextResponse.json(
        { error: "Subfolder access is inherited from the parent folder" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const rawIds = Array.isArray(body.memberIds) ? body.memberIds : null;
    if (!rawIds) {
      return NextResponse.json({ error: "Select folder members" }, { status: 400 });
    }

    const requestedIds: string[] = Array.from(
      new Set<string>(rawIds.map((value: unknown) => String(value))),
    );

    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      select: { userId: true },
    });
    const orgUserIds = new Set(orgMembers.map((member) => member.userId));
    const nextMemberIds: string[] = Array.from(
      new Set<string>(
        [...requestedIds, folder.ownerId].filter((id) => orgUserIds.has(id)),
      ),
    );

    await prisma.$transaction([
      prisma.docFolderMember.deleteMany({
        where: {
          folderId: id,
          userId: { notIn: nextMemberIds },
        },
      }),
      ...nextMemberIds.map((userId) =>
        prisma.docFolderMember.upsert({
          where: { folderId_userId: { folderId: id, userId } },
          update: {},
          create: { folderId: id, userId },
        }),
      ),
    ]);

    const members = await prisma.docFolderMember.findMany({
      where: { folderId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json(
      members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Failed to update members" }, { status: 500 });
  }
}
