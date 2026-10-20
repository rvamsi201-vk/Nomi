import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dayBounds(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00.000Z`);
  const to = new Date(`${toKey}T23:59:59.999Z`);
  return { from, to };
}

export async function GET(request: Request) {
  try {
    const { user, membership, org } = await requireMembership();
    const { searchParams } = new URL(request.url);
    const fromKey = String(searchParams.get("from") ?? "");
    const toKey = String(searchParams.get("to") ?? "");
    const filterUserId = searchParams.get("userId");
    const openOnly = searchParams.get("open") === "1";

    if (openOnly) {
      const open = await prisma.timeEntry.findFirst({
        where: {
          organizationId: org.id,
          userId: user.id,
          endedAt: null,
        },
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json(open);
    }

    if (!isDateKey(fromKey) || !isDateKey(toKey)) {
      return NextResponse.json(
        { error: "Provide from=YYYY-MM-DD and to=YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const isAdmin = membership.role === "admin";
    let userIdFilter = user.id;
    if (isAdmin && filterUserId) {
      const member = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: { orgId: org.id, userId: String(filterUserId) },
        },
      });
      if (!member) {
        return NextResponse.json({ error: "User not in org" }, { status: 404 });
      }
      userIdFilter = String(filterUserId);
    } else if (isAdmin && !filterUserId) {
      userIdFilter = "";
    } else if (!isAdmin && filterUserId && filterUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { from, to } = dayBounds(fromKey, toKey);

    const entries = await prisma.timeEntry.findMany({
      where: {
        organizationId: org.id,
        ...(userIdFilter ? { userId: userIdFilter } : {}),
        startedAt: { gte: from, lte: to },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
