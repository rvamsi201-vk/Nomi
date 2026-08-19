import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireUser();
    const channels = await prisma.channel.findMany({
      where: {
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
    const user = await requireUser();
    const body = await request.json();
    const name = String(body.name ?? "").trim().replace(/^#/, "");

    if (!name) {
      return NextResponse.json({ error: "Channel name required" }, { status: 400 });
    }

    const base = slugify(name) || "channel";
    let slug = base;
    let n = 1;
    while (await prisma.channel.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const users = await prisma.user.findMany();
    const channel = await prisma.channel.create({
      data: {
        name: slug,
        slug,
        type: "public",
        members: {
          create: users.map((u) => ({ userId: u.id })),
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
