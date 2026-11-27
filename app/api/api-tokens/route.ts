import { NextResponse } from "next/server";
import { generateApiToken, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const tokens = await prisma.apiToken.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      tokens.map((t) => ({
        id: t.id,
        name: t.name,
        prefix: t.prefix,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        user: t.user,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const name = String(body.name ?? "").trim() || "api-token";
    const userId = body.userId ? String(body.userId) : admin.id;

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { token, tokenHash, prefix } = generateApiToken();
    const row = await prisma.apiToken.create({
      data: {
        userId,
        tokenHash,
        name,
        prefix,
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        prefix: row.prefix,
        createdAt: row.createdAt,
        token,
        userId,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "No organization") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.apiToken.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    if (message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
