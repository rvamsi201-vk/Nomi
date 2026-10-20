import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

const SESSION = "nomi_user_id";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

function signUserId(userId: string) {
  return createHmac("sha256", sessionSecret()).update(userId).digest("hex");
}

function verifySession(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const userId = value.slice(0, separator);
  const supplied = value.slice(separator + 1);
  const expected = signUserId(userId);
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }
  return userId;
}

export async function getCurrentUser() {
  const store = await cookies();
  const value = store.get(SESSION)?.value;
  const userId = value ? verifySession(value) : null;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getMembership(userId: string) {
  return prisma.orgMember.findFirst({
    where: { userId },
    include: { org: true },
  });
}

export async function requireMembership() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) throw new Error("No organization");
  return { user, membership, org: membership.org };
}

export async function requireAdmin() {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "admin") {
    throw new Error("Forbidden");
  }
  return ctx;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(SESSION, `${userId}.${signUserId(userId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION);
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

