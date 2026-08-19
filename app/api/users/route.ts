import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { user, org } = await requireMembership();
    const members = await prisma.orgMember.findMany({
      where: {
        orgId: org.id,
        userId: { not: user.id },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json(members.map((m) => m.user));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
