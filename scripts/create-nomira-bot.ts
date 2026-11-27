/**
 * Upsert admin bot user "nomira" and mint an API token for MCP/CLI.
 *
 * Usage (from /srv/apps/nomi/source):
 *   npx tsx scripts/create-nomira-bot.ts
 */
import { mkdir, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { applyRoleChannelAccess } from "../lib/access";
import { generateApiToken } from "../lib/api-token";
import { prisma } from "../lib/db";
import { hash } from "bcryptjs";

const BOT_NAME = "nomira";
const ENV_OUT = "/srv/apps/shared/mcp-nomi/.env";
const BASE_URL = process.env.NOMI_BASE_URL || "http://127.0.0.1:3002";

async function main() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    throw new Error("No organization found. Register a workspace in Nomi first.");
  }

  const emailDomain = org.slug.replace(/[^a-z0-9-]/gi, "") || "local";
  const email = `nomi-bot@${emailDomain}.local`;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Also match by display name if a previous email was used
    user = await prisma.user.findFirst({ where: { name: BOT_NAME } });
  }

  if (!user) {
    const password = randomBytes(24).toString("base64url");
    user = await prisma.user.create({
      data: {
        name: BOT_NAME,
        email,
        passwordHash: await hash(password, 10),
        orgMemberships: {
          create: { orgId: org.id, role: "admin" },
        },
      },
    });
    console.log(`Created user ${BOT_NAME} <${email}> id=${user.id}`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: BOT_NAME, email },
    });
    await prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      update: { role: "admin" },
      create: { orgId: org.id, userId: user.id, role: "admin" },
    });
    console.log(`Updated user ${BOT_NAME} <${email}> id=${user.id}`);
  }

  await applyRoleChannelAccess(org.id, user.id, "admin");

  // Add nomira to all projects so task assignment / writes work broadly
  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    select: { id: true },
  });
  for (const project of projects) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: {},
      create: { projectId: project.id, userId: user.id },
    });
  }

  // Revoke previous mcp-cli tokens for this user, then mint fresh
  await prisma.apiToken.deleteMany({
    where: { userId: user.id, name: "mcp-cli" },
  });
  const { token, tokenHash, prefix } = generateApiToken();
  await prisma.apiToken.create({
    data: {
      userId: user.id,
      tokenHash,
      name: "mcp-cli",
      prefix,
    },
  });

  const envBody = [
    `NOMI_BASE_URL=${BASE_URL}`,
    `NOMI_API_TOKEN=${token}`,
    `# nomira ${email} token prefix ${prefix}`,
    "",
  ].join("\n");

  await mkdir(path.dirname(ENV_OUT), { recursive: true });
  await writeFile(ENV_OUT, envBody, { mode: 0o600 });
  await chmod(ENV_OUT, 0o600);

  console.log(`Wrote ${ENV_OUT}`);
  console.log(`Token prefix: ${prefix}`);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
