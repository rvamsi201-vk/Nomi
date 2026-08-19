import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const users = await prisma.user.findMany({
      where: { id: { not: user.id } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
