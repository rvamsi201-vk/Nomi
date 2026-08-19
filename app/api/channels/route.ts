import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const { user, org } = await requireMembership();
    const channels = await prisma.channel.findMany({
      where: {
        organizationId: org.id,
        type: "public",
        members: { some: { userId: user.id } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(channels);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, org } = await requireMembership();
    const body = await request.json();
    const name = String(body.name ?? "").trim().replace(/^#/, "");

    if (!name) {
      return NextResponse.json({ error: "Channel name required" }, { status: 400 });
    }

    const base = slugify(name) || "channel";
    let slug = base;
    let n = 1;
    while (
      await prisma.channel.findUnique({
        where: {
          organizationId_slug: { organizationId: org.id, slug },
        },
      })
    ) {
      slug = `${base}-${n++}`;
    }

    const members = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      select: { userId: true },
    });

    const channel = await prisma.channel.create({
      data: {
        organizationId: org.id,
        name: slug,
        slug,
        type: "public",
        members: {
          create: members.map((m) => ({ userId: m.userId })),
        },
      },
    });

    await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: user.id,
        text: `Created #${channel.name}`,
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
