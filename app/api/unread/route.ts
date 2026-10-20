import { NextResponse } from "next/server";
import { userCanAccessChannel } from "@/lib/access";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { user, org, membership } = await requireMembership();
    const members = await prisma.channelMember.findMany({
      where: {
        userId: user.id,
        channel: { organizationId: org.id },
      },
      select: { channelId: true, lastReadAt: true },
    });

    const accessible = (
      await Promise.all(
        members.map(async (member) => {
          const allowed = await userCanAccessChannel(
            member.channelId,
            user.id,
            org.id,
            membership.role,
          );
          return allowed ? member : null;
        }),
      )
    ).filter((member): member is (typeof members)[number] => member !== null);

    const counts: Record<string, number> = {};
    await Promise.all(
      accessible.map(async (member) => {
        const since = member.lastReadAt ?? new Date();
        const count = await prisma.message.count({
          where: {
            channelId: member.channelId,
            userId: { not: user.id },
            createdAt: { gt: since },
            ...(membership.role === "admin"
              ? {}
              : { NOT: { text: { startsWith: "📋" } } }),
          },
        });
        if (count > 0) counts[member.channelId] = count;
      }),
    );

    return NextResponse.json(counts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
