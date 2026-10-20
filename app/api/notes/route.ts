import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

const COLORS = new Set(["butter", "mint", "blush", "sky", "lilac"]);

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const { user } = await requireMembership();
    const { searchParams } = new URL(request.url);
    const dateKey = String(searchParams.get("date") ?? "");
    const month = String(searchParams.get("month") ?? "");

    if (dateKey) {
      if (!isDateKey(dateKey)) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      const notes = await prisma.stickyNote.findMany({
        where: { userId: user.id, dateKey },
        orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json(notes);
    }

    if (/^\d{4}-\d{2}$/.test(month)) {
      const notes = await prisma.stickyNote.findMany({
        where: {
          userId: user.id,
          dateKey: { startsWith: month },
        },
        select: { dateKey: true },
      });
      const counts: Record<string, number> = {};
      for (const note of notes) {
        counts[note.dateKey] = (counts[note.dateKey] ?? 0) + 1;
      }
      return NextResponse.json(counts);
    }

    return NextResponse.json(
      { error: "Provide date=YYYY-MM-DD or month=YYYY-MM" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireMembership();
    const body = await request.json();
    const dateKey = String(body.dateKey ?? "");
    const color = COLORS.has(String(body.color))
      ? String(body.color)
      : "butter";
    const x = Number.isFinite(Number(body.x)) ? Number(body.x) : 48;
    const y = Number.isFinite(Number(body.y)) ? Number(body.y) : 48;

    if (!isDateKey(dateKey)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const top = await prisma.stickyNote.findFirst({
      where: { userId: user.id, dateKey },
      orderBy: { zIndex: "desc" },
      select: { zIndex: true },
    });

    const note = await prisma.stickyNote.create({
      data: {
        userId: user.id,
        dateKey,
        body: "",
        color,
        x,
        y,
        zIndex: (top?.zIndex ?? 0) + 1,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
