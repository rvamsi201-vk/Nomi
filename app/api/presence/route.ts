import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUserOnline } from "@/lib/presence";

export async function GET() {
  try {
    const { org } = await requireMembership();
    const members = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: { user: { select: { id: true, lastSeenAt: true } } },
    });
    return NextResponse.json({
      onlineUserIds: members
        .filter((member) => isUserOnline(member.user.lastSeenAt))
        .map((member) => member.user.id),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const { user } = await requireMembership();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
