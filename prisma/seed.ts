import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { dmSlug } from "../lib/dms";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "exora" },
    update: {},
    create: {
      name: "Exora Solutions",
      slug: "exora",
    },
  });

  const raghu = await prisma.user.upsert({
    where: { email: "raghu@nomi.local" },
    update: { passwordHash },
    create: {
      name: "Raghu",
      email: "raghu@nomi.local",
      passwordHash,
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: "alex@nomi.local" },
    update: { passwordHash },
    create: {
      name: "Alex",
      email: "alex@nomi.local",
      passwordHash,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: raghu.id } },
    update: { role: "admin" },
    create: { orgId: org.id, userId: raghu.id, role: "admin" },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: alex.id } },
    update: { role: "member" },
    create: { orgId: org.id, userId: alex.id, role: "member" },
  });

  const general = await prisma.channel.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "general" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "general",
      slug: "general",
      type: "public",
    },
  });

  const random = await prisma.channel.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "random" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "random",
      slug: "random",
      type: "public",
    },
  });

  for (const channel of [general, random]) {
    for (const user of [raghu, alex]) {
      await prisma.channelMember.upsert({
        where: {
          channelId_userId: { channelId: channel.id, userId: user.id },
        },
        update: {},
        create: { channelId: channel.id, userId: user.id },
      });
    }
  }

  const messageCount = await prisma.message.count({
    where: { channelId: general.id },
  });

  if (messageCount === 0) {
    await prisma.message.create({
      data: {
        channelId: general.id,
        userId: raghu.id,
        text: "Welcome to the workspace! Admins can add employees from Team.",
      },
    });
  }

  const dmSlugValue = dmSlug(raghu.id, alex.id);
  let dm = await prisma.channel.findUnique({
    where: {
      organizationId_slug: { organizationId: org.id, slug: dmSlugValue },
    },
  });
  if (!dm) {
    dm = await prisma.channel.create({
      data: {
        organizationId: org.id,
        name: "dm",
        slug: dmSlugValue,
        type: "dm",
        members: {
          create: [{ userId: raghu.id }, { userId: alex.id }],
        },
        messages: {
          create: {
            userId: alex.id,
            text: "Hey Raghu — DMs are working!",
          },
        },
      },
    });
  }

  let project = await prisma.project.findUnique({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "nomi-launch" },
    },
  });

  if (!project) {
    const projChannel = await prisma.channel.create({
      data: {
        organizationId: org.id,
        name: "proj-nomi-launch",
        slug: "proj-nomi-launch",
        type: "public",
        members: {
          create: [{ userId: raghu.id }, { userId: alex.id }],
        },
      },
    });

    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Nomi Launch",
        slug: "nomi-launch",
        description: "Ship the internal team workspace.",
        ownerId: raghu.id,
        channelId: projChannel.id,
      },
    });
  }

  const taskCount = await prisma.task.count({
    where: { projectId: project.id },
  });

  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Polish chat UI",
          status: "done",
          assigneeId: raghu.id,
        },
        {
          projectId: project.id,
          title: "Add direct messages",
          status: "done",
          assigneeId: alex.id,
        },
        {
          projectId: project.id,
          title: "Build task kanban",
          status: "in_progress",
          assigneeId: raghu.id,
        },
        {
          projectId: project.id,
          title: "Onboard the team",
          status: "todo",
          assigneeId: alex.id,
        },
        {
          projectId: project.id,
          title: "Write deploy notes",
          status: "backlog",
        },
      ],
    });
  }

  console.log("Seed complete");
  console.log("Org: Exora Solutions");
  console.log("Admin: raghu@nomi.local / password123");
  console.log("Member: alex@nomi.local / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
