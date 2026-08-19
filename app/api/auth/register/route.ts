import { NextResponse } from "next/server";
import {
  addUserToPublicChannels,
  createSession,
  hashPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const orgCount = await prisma.organization.count();
  if (orgCount > 0) {
    return NextResponse.json(
      {
        error:
          "This workspace already exists. Ask your admin to add you from Team.",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const orgName = String(body.orgName ?? "").trim() || "My Company";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const baseSlug = slugify(orgName) || "workspace";

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: baseSlug,
      members: {
        create: { userId: user.id, role: "admin" },
      },
      channels: {
        create: [
          { name: "general", slug: "general", type: "public" },
          { name: "random", slug: "random", type: "public" },
        ],
      },
    },
    include: { channels: true },
  });

  await addUserToPublicChannels(org.id, user.id);

  await prisma.message.create({
    data: {
      channelId: org.channels.find((c) => c.slug === "general")!.id,
      userId: user.id,
      text: `Welcome to ${org.name}! Add employees from Team in the sidebar.`,
    },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
