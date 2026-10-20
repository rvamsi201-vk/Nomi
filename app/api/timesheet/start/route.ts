import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_WORK_LEN = 280;

export async function POST(request: Request) {
  try {
    const { user, org } = await requireMembership();
    const body = await request.json().catch(() => ({}));
    const work = String(body.work ?? "").trim();

    if (!work) {
      return NextResponse.json(
        { error: "Describe the work before starting" },
        { status: 400 },
      );
    }
    if (work.length > MAX_WORK_LEN) {
      return NextResponse.json(
        { error: `Work description must be under ${MAX_WORK_LEN} characters` },
        { status: 400 },
      );
    }

    const open = await prisma.timeEntry.findFirst({
      where: {
        organizationId: org.id,
        userId: user.id,
        endedAt: null,
      },
    });

    if (open) {
      return NextResponse.json(
        { error: "Already clocked in" },
        { status: 409 },
      );
    }

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        work,
        startedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }
}
