import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION = "nomi_user_id";

export async function getCurrentUser() {
  const store = await cookies();
  const userId = store.get(SESSION)?.value;
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
  store.set(SESSION, userId, { httpOnly: true, sameSite: "lax", path: "/" });
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

export async function addUserToPublicChannels(
  organizationId: string,
  userId: string,
) {
  const channels = await prisma.channel.findMany({
    where: { organizationId, type: "public" },
  });
  for (const channel of channels) {
    await prisma.channelMember.upsert({
      where: {
        channelId_userId: { channelId: channel.id, userId },
      },
      update: {},
      create: { channelId: channel.id, userId },
    });
  }
}
