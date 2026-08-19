import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dmSlug } from "@/lib/dms";

export async function GET() {
  try {
    const user = await requireUser();
    const channels = await prisma.channel.findMany({
      where: {
        type: "dm",
        members: { some: { userId: user.id } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dms = channels.map((channel) => {
      const other = channel.members.find((m) => m.userId !== user.id)?.user;
      return {
        id: channel.id,
        slug: channel.slug,
        name: other?.name ?? "Direct message",
        otherUserId: other?.id ?? null,
      };
    });

    return NextResponse.json(dms);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const otherUserId = String(body.userId ?? "");

    if (!otherUserId || otherUserId === user.id) {
      return NextResponse.json({ error: "Pick a teammate" }, { status: 400 });
    }

    const other = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!other) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const slug = dmSlug(user.id, other.id);
    let channel = await prisma.channel.findUnique({ where: { slug } });

    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          name: "dm",
          slug,
          type: "dm",
          members: {
            create: [{ userId: user.id }, { userId: other.id }],
          },
        },
      });
    }

    return NextResponse.json({
      id: channel.id,
      slug: channel.slug,
      name: other.name,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
