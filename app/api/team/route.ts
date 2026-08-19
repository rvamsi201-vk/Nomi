import { NextResponse } from "next/server";
import {
  addUserToPublicChannels,
  hashPassword,
  requireAdmin,
  requireMembership,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { org, membership } = await requireMembership();

    const members = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
      orderBy: [{ role: "asc" }, { userId: "asc" }],
    });

    return NextResponse.json({
      org: { id: org.id, name: org.name, slug: org.slug },
      currentRole: membership.role,
      members: members.map((m) => ({
        role: m.role,
        ...m.user,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { org, user: admin } = await requireAdmin();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "member";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and temporary password are required" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already used. Pick a different email." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const employee = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        orgMemberships: {
          create: { orgId: org.id, role },
        },
      },
    });

    await addUserToPublicChannels(org.id, employee.id);

    const general = await prisma.channel.findUnique({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: "general",
        },
      },
    });

    if (general) {
      await prisma.message.create({
        data: {
          channelId: general.id,
          userId: admin.id,
          text: `👋 ${admin.name} added ${employee.name} to the workspace.`,
        },
      });
    }

    return NextResponse.json(
      {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Only admins can add employees" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
