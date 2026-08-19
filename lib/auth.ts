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
