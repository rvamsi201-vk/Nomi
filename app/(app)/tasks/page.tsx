import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const statusStyles: Record<string, string> = {
  backlog: "bg-zinc-500/15 text-zinc-300",
  todo: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  done: "bg-emerald-500/15 text-emerald-300",
};

export default async function TasksPage() {
  await requireUser();

  const tasks = await prisma.task.findMany({
    include: {
      project: { select: { name: true, slug: true } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-[var(--border)] px-8 py-6">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          All tasks across projects
        </p>
      </header>

      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--card)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-t border-[var(--border)] bg-[#0f1117]"
                >
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${task.project.slug}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[task.status] ?? "bg-zinc-500/15 text-zinc-300"}`}
                    >
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {task.assignee?.name ?? "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tasks.length === 0 ? (
            <div className="p-10 text-center text-[var(--muted)]">
              No tasks yet. Open a project and add one.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
