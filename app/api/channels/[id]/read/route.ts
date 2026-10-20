import { NextResponse } from "next/server";
import { ensureChannelReadRow, userCanAccessChannel } from "@/lib/access";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, org, membership } = await requireMembership();
    const { id } = await params;
    if (!(await userCanAccessChannel(id, user.id, org.id, membership.role))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    await ensureChannelReadRow(id, user.id);
    await prisma.channelMember.update({
      where: { channelId_userId: { channelId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
