import { NextResponse } from "next/server";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (newPassword && newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const emailOwner = await prisma.user.findFirst({
      where: { email, id: { not: user.id } },
      select: { id: true },
    });
    if (emailOwner) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        passwordHash: newPassword ? await hashPassword(newPassword) : undefined,
      },
      select: { email: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update account settings" }, { status: 500 });
  }
}
