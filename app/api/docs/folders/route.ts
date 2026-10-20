import { NextResponse } from "next/server";
import { requireAdmin, requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFolder, getOrgFolder, userCanAccessFolder } from "@/lib/docs";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const { user, org, membership } = await requireMembership();
    const isAdmin = membership.role === "admin";
    const folders = await prisma.docFolder.findMany({
      where: {
        organizationId: org.id,
        parentId: null,
        ...(isAdmin
          ? {}
          : {
              OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            }),
      },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { files: true, members: true, children: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(folders);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const parentId = body.parentId ? String(body.parentId) : null;
    const rawIds = Array.isArray(body.memberIds) ? body.memberIds : [];

    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    let user;
    let org;
    let parent = null;

    if (parentId) {
      const session = await requireMembership();
      user = session.user;
      org = session.org;
      parent = await getOrgFolder(parentId, org.id);
      if (!parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
      if (!canManageFolder(parent, user.id, session.membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!(await userCanAccessFolder(parent, user.id, session.membership.role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const session = await requireAdmin();
      user = session.user;
      org = session.org;
    }

    const base = slugify(name) || "folder";
    let slug = base;
    let n = 1;
    while (
      await prisma.docFolder.findUnique({
        where: { organizationId_slug: { organizationId: org.id, slug } },
      })
    ) {
      slug = `${base}-${n++}`;
    }

    // Subfolders inherit access from the parent; no separate member list.
    let memberIds: string[] = [];
    if (!parentId) {
      const orgMembers = await prisma.orgMember.findMany({
        where: { orgId: org.id },
        select: { userId: true },
      });
      const orgUserIds = new Set(orgMembers.map((member) => member.userId));
      const requestedIds = rawIds.map((value: unknown) => String(value));
      memberIds = [
        ...new Set(
          [user.id, ...requestedIds].filter((id) => orgUserIds.has(id)),
        ),
      ];
    }

    const folder = await prisma.docFolder.create({
      data: {
        organizationId: org.id,
        name,
        slug,
        description,
        ownerId: user.id,
        parentId,
        ...(memberIds.length > 0
          ? {
              members: {
                create: memberIds.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { files: true, members: true, children: true } },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
