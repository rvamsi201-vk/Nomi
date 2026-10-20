import { prisma } from "@/lib/db";

export const GENERAL_CHANNEL_SLUG = "general";

function isGeneralChannel(channel: { slug: string; project?: { id: string } | null }) {
  return channel.slug === GENERAL_CHANNEL_SLUG && !channel.project;
}

export async function listVisibleChannels(orgId: string, userId: string, role: string) {
  if (role === "admin") {
    return prisma.channel.findMany({
      where: { organizationId: orgId, type: { not: "dm" } },
      orderBy: { name: "asc" },
    });
  }

  return prisma.channel.findMany({
    where: {
      organizationId: orgId,
      type: { not: "dm" },
      OR: [
        { slug: GENERAL_CHANNEL_SLUG, project: { is: null } },
        { project: { members: { some: { userId } } } },
      ],
    },
    orderBy: { name: "asc" },
  });
}

export async function userCanAccessChannel(
  channelId: string,
  userId: string,
  orgId: string,
  role: string,
) {
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, organizationId: orgId },
    include: {
      project: { select: { id: true } },
      members: { where: { userId }, select: { userId: true } },
    },
  });

  if (!channel) return false;
  if (channel.type === "dm") return channel.members.length > 0;
  if (role === "admin") return true;
  if (isGeneralChannel(channel)) return true;
  if (!channel.project) return false;

  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: channel.project.id, userId },
    },
  });
  return Boolean(projectMember);
}

export async function ensureChannelReadRow(channelId: string, userId: string) {
  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    update: {},
    create: { channelId, userId, lastReadAt: new Date() },
  });
}

async function orgAdminIds(orgId: string) {
  const admins = await prisma.orgMember.findMany({
    where: { orgId, role: "admin" },
    select: { userId: true },
  });
  return admins.map((admin) => admin.userId);
}

async function orgUserIds(orgId: string) {
  const members = await prisma.orgMember.findMany({
    where: { orgId },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function setChannelMembers(channelId: string, allowedIds: string[]) {
  await prisma.channelMember.deleteMany({
    where: {
      channelId,
      userId: { notIn: allowedIds },
    },
  });
  await Promise.all(
    allowedIds.map((userId) =>
      prisma.channelMember.upsert({
        where: { channelId_userId: { channelId, userId } },
        update: {},
        create: { channelId, userId, lastReadAt: new Date() },
      }),
    ),
  );
}

export async function ensureGeneralChannelMembership(orgId: string, userId: string) {
  const general = await prisma.channel.findUnique({
    where: {
      organizationId_slug: { organizationId: orgId, slug: GENERAL_CHANNEL_SLUG },
    },
    include: { project: { select: { id: true } } },
  });
  if (!general || general.project) return;
  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId: general.id, userId } },
    update: {},
    create: { channelId: general.id, userId, lastReadAt: new Date() },
  });
}

export async function syncProjectChannelMembers(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });
  if (!project?.channelId) return;

  const allowed = new Set<string>([
    ...(await orgAdminIds(project.organizationId)),
    ...project.members.map((member) => member.userId),
  ]);
  const allowedIds = [...allowed];

  await prisma.channelMember.deleteMany({
    where: {
      channelId: project.channelId,
      userId: { notIn: allowedIds },
    },
  });

  await Promise.all(
    allowedIds.map((userId) =>
      prisma.channelMember.upsert({
        where: {
          channelId_userId: { channelId: project.channelId!, userId },
        },
        update: {},
        create: {
          channelId: project.channelId!,
          userId,
          lastReadAt: new Date(),
        },
      }),
    ),
  );
}

export async function syncWorkspaceChannelMembers(orgId: string) {
  const adminIds = await orgAdminIds(orgId);
  const memberIds = await orgUserIds(orgId);
  const channels = await prisma.channel.findMany({
    where: {
      organizationId: orgId,
      type: { not: "dm" },
      project: { is: null },
    },
    select: { id: true, slug: true },
  });

  for (const channel of channels) {
    const allowedIds =
      channel.slug === GENERAL_CHANNEL_SLUG ? memberIds : adminIds;
    await setChannelMembers(channel.id, allowedIds);
  }
}

export async function reconcileOrgChannelAccess(orgId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, ownerId: true },
  });
  for (const project of projects) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: project.ownerId },
      },
      update: {},
      create: { projectId: project.id, userId: project.ownerId },
    });
    await syncProjectChannelMembers(project.id);
  }
  await syncWorkspaceChannelMembers(orgId);
}

export async function applyRoleChannelAccess(
  orgId: string,
  userId: string,
  role: string,
) {
  if (role === "admin") {
    const channels = await prisma.channel.findMany({
      where: { organizationId: orgId, type: { not: "dm" } },
      select: { id: true },
    });
    await Promise.all(
      channels.map((channel) =>
        prisma.channelMember.upsert({
          where: { channelId_userId: { channelId: channel.id, userId } },
          update: {},
          create: {
            channelId: channel.id,
            userId,
            lastReadAt: new Date(),
          },
        }),
      ),
    );
    return;
  }

  const assigned = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      members: { some: { userId } },
      channelId: { not: null },
    },
    select: { channelId: true },
  });
  const keep = assigned
    .map((project) => project.channelId)
    .filter((id): id is string => Boolean(id));

  const general = await prisma.channel.findUnique({
    where: {
      organizationId_slug: { organizationId: orgId, slug: GENERAL_CHANNEL_SLUG },
    },
    select: { id: true },
  });
  if (general) keep.push(general.id);

  await prisma.channelMember.deleteMany({
    where: {
      userId,
      channel: { organizationId: orgId, type: { not: "dm" } },
      ...(keep.length > 0 ? { channelId: { notIn: keep } } : {}),
    },
  });

  await ensureGeneralChannelMembership(orgId, userId);
}
