"use client";

import { useRouter } from "next/navigation";
import { TASK_STATUSES } from "@/lib/constants";

type TaskCard = {
  id: string;
  title: string;
  status: string;
  assignee?: { id: string; name: string } | null;
};

export function KanbanBoard({ tasks }: { tasks: TaskCard[] }) {
  const router = useRouter();

  async function moveTask(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {TASK_STATUSES.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);

        return (
          <section
            key={column.id}
            className="rounded-xl border border-[var(--border)] bg-[#0f1117]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
                <h3 className="text-sm font-medium">{column.label}</h3>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3 p-3">
              {columnTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <h4 className="text-sm font-medium">{task.title}</h4>
                  <p className="mt-2 text-xs text-zinc-400">
                    {task.assignee?.name ?? "Unassigned"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TASK_STATUSES.filter((item) => item.id !== task.status).map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => moveTask(task.id, item.id)}
                          className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-zinc-300 hover:border-[var(--accent)]"
                        >
                          {item.label}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {columnTasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-[var(--muted)]">
                  No tasks
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
