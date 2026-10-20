import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TASK_STATUSES } from "@/lib/constants";

export default async function HomePage() {
  const { user, org, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    memberCount,
    projectCount,
    taskCount,
    channelCount,
    recentMessages,
    tasksByStatus,
    recentProjects,
    myTasks,
  ] = await Promise.all([
    prisma.orgMember.count({ where: { orgId: org.id } }),
    prisma.project.count({ where: { organizationId: org.id } }),
    prisma.task.count({ where: { project: { organizationId: org.id } } }),
    prisma.channel.count({
      where: { organizationId: org.id, type: { not: "dm" } },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: weekAgo },
        channel: { organizationId: org.id },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { project: { organizationId: org.id } },
      _count: { _all: true },
    }),
    prisma.project.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, slug: true },
    }),
    prisma.task.count({
      where: {
        assigneeId: user.id,
        status: { not: "done" },
        project: { organizationId: org.id },
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    tasksByStatus.map((row) => [row.status, row._count._all]),
  );

  const quickLinks = [
    { href: "/projects", label: "Projects", note: "Workstreams" },
    { href: "/tasks", label: "Tasks", note: "Assigned work" },
    { href: "/notes", label: "Notes", note: "Sticky ideas" },
    { href: "/docs", label: "Docs", note: "Shared files" },
    { href: "/team", label: "Team", note: "People" },
    { href: "/timesheet", label: "Time Sheet", note: "Clock in/out" },
    { href: "/chat", label: "Chat", note: "Channels" },
    { href: "/settings", label: "Settings", note: "Account" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14">
        <header className="mb-12 max-w-3xl">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-4 text-4xl font-normal tracking-[-0.05em] md:text-5xl">
            Home
          </h1>
          <p className="mt-4 text-base text-[var(--muted)]">
            Welcome back, {user.name}. Jump into the workspace from here.
          </p>
        </header>

        <section className="mb-14">
          <p className="project-kicker">Quick access</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border border-[var(--border)] bg-[var(--card)] px-5 py-5 transition hover:border-[var(--accent)]"
              >
                <p className="text-base font-medium">{link.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{link.note}</p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin ? (
          <section>
            <p className="project-kicker">Analytics</p>
            <h2 className="mt-2 text-2xl font-normal tracking-[-0.035em]">
              Workspace snapshot
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Members", value: memberCount },
                { label: "Projects", value: projectCount },
                { label: "Tasks", value: taskCount },
                { label: "Channels", value: channelCount },
                { label: "Messages this week", value: recentMessages },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="border-t-2 border-[var(--accent)] pt-4"
                >
                  <p className="text-3xl font-normal tracking-[-0.04em]">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium">Tasks by stage</h3>
                <div className="mt-5 space-y-3">
                  {TASK_STATUSES.map((status) => {
                    const count = statusCounts[status.id] ?? 0;
                    const max = Math.max(taskCount, 1);
                    return (
                      <div key={status.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{status.label}</span>
                          <span className="text-[var(--muted)]">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--border)]">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${Math.round((count / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium">Latest projects</h3>
                <div className="mt-5">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug}`}
                      className="block border-b border-[var(--border)] py-3 text-sm hover:text-[var(--accent)]"
                    >
                      {project.name}
                    </Link>
                  ))}
                  {recentProjects.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No projects yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <p className="project-kicker">Your work</p>
            <p className="mt-4 text-sm text-[var(--muted)]">
              You have {myTasks} open {myTasks === 1 ? "task" : "tasks"} assigned
              to you.
            </p>
            <Link href="/tasks" className="project-link mt-4 inline-block text-sm">
              View my tasks →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
