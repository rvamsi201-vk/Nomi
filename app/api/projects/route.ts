import { NextResponse } from "next/server";
import { syncProjectChannelMembers } from "@/lib/access";
import { requireAdmin, requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const { user, org, membership } = await requireMembership();
    const isAdmin = membership.role === "admin";
    const projects = await prisma.project.findMany({
      where: {
        organizationId: org.id,
        ...(isAdmin
          ? {}
          : { members: { some: { userId: user.id } } }),
      },
      include: {
        owner: { select: { id: true, name: true } },
        channel: { select: { id: true, slug: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, org } = await requireAdmin();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const createChannel = Boolean(body.createChannel ?? true);

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const base = slugify(name) || "project";
    let slug = base;
    let n = 1;
    while (
      await prisma.project.findUnique({
        where: {
          organizationId_slug: { organizationId: org.id, slug },
        },
      })
    ) {
      slug = `${base}-${n++}`;
    }

    let channelId: string | null = null;
    let channelSlug: string | null = null;

    if (createChannel) {
      const channelName = `proj-${slug}`.slice(0, 48);
      let cSlug = channelName;
      let i = 1;
      while (
        await prisma.channel.findUnique({
          where: {
            organizationId_slug: { organizationId: org.id, slug: cSlug },
          },
        })
      ) {
        cSlug = `${channelName}-${i++}`;
      }

      const admins = await prisma.orgMember.findMany({
        where: { orgId: org.id, role: "admin" },
        select: { userId: true },
      });
      const channelMembers = [
        ...new Set([user.id, ...admins.map((member) => member.userId)]),
      ];

      const channel = await prisma.channel.create({
        data: {
          organizationId: org.id,
          name: cSlug,
          slug: cSlug,
          type: "private",
          members: {
            create: channelMembers.map((userId) => ({
              userId,
              lastReadAt: new Date(),
            })),
          },
          messages: {
            create: {
              userId: user.id,
              text: `Project channel for ${name}`,
            },
          },
        },
      });
      channelId = channel.id;
      channelSlug = channel.slug;
    }

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name,
        slug,
        description,
        ownerId: user.id,
        channelId,
        members: {
          create: { userId: user.id },
        },
      },
      include: {
        owner: { select: { id: true, name: true } },
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    await syncProjectChannelMembers(project.id);

    return NextResponse.json({ ...project, channelSlug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "No organization") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
