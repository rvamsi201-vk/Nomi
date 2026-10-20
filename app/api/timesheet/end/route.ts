import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const { user, org } = await requireMembership();

    const open = await prisma.timeEntry.findFirst({
      where: {
        organizationId: org.id,
        userId: user.id,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (!open) {
      return NextResponse.json(
        { error: "No open session" },
        { status: 404 },
      );
    }

    const entry = await prisma.timeEntry.update({
      where: { id: open.id },
      data: { endedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to end" }, { status: 500 });
  }
}
