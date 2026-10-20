import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { todayDayIndex } from "@/lib/weekly-goals";

const statusLabel: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default async function TasksPage() {
  const { user, org, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";
  const dayIndex = todayDayIndex();

  const tasks = await prisma.task.findMany({
    where: {
      project: {
        organizationId: org.id,
        ...(isAdmin ? {} : { members: { some: { userId: user.id } } }),
      },
      ...(isAdmin ? {} : { assigneeId: user.id }),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-14 max-w-3xl md:mb-20">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            Tasks
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {isAdmin
              ? "All assigned work across the workspace."
              : "Only the tasks assigned to you."}
          </p>
          <div className="mt-8 text-sm text-[var(--muted)]">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </div>
        </header>

        <section>
          <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="project-kicker">List</p>
              <h2 className="mt-2 text-xl font-medium">
                {isAdmin ? "All tasks" : "My tasks"}
              </h2>
            </div>
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-4 border-b border-[var(--border)] py-6 md:grid-cols-[minmax(0,1fr)_160px_120px_120px_160px_160px_140px] md:items-center"
            >
              <p className="text-base leading-6">{task.title}</p>
              <Link href={`/projects/${task.project.slug}`} className="project-link text-sm">
                {task.project.name}
              </Link>
              <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {statusLabel[task.status] ?? task.status.replace(/_/g, " ")}
              </span>
              <span className="text-sm text-[var(--muted)]">
                {task.assignee?.name ?? "Unassigned"}
              </span>
              <div className="text-xs text-[var(--muted)]">
                <p className="project-kicker">Created</p>
                <p className="mt-1">{formatTime(task.createdAt)}</p>
              </div>
              <div className="text-xs text-[var(--muted)]">
                <p className="project-kicker">Status updated</p>
                <p className="mt-1">{formatTime(task.statusUpdatedAt)}</p>
              </div>
              <Link
                href={`/projects/${task.project.slug}?weeklyTask=${task.id}&weeklyDay=${dayIndex}`}
                className="topbar-btn inline-flex w-fit text-xs"
              >
                Weekly goal
              </Link>
            </div>
          ))}
          {tasks.length === 0 ? (
            <p className="border-b border-[var(--border)] py-16 text-center text-[var(--muted)]">
              {isAdmin
                ? "No tasks yet. Open a project and add one."
                : "No tasks assigned to you yet."}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
