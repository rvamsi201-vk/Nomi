import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const channels = await prisma.channel.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });

    await prisma.channelMember.deleteMany({
      where: {
        userId,
        channelId: { in: channels.map((c) => c.id) },
      },
    });

    await prisma.orgMember.delete({
      where: { orgId_userId: { orgId: org.id, userId } },
    });

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
