"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUSES } from "@/lib/constants";
import { formatTime } from "@/lib/utils";

type TaskCard = {
  id: string;
  title: string;
  status: string;
  createdAt: string | Date;
  statusUpdatedAt: string | Date;
  assignee?: { id: string; name: string } | null;
};

type UserOption = { id: string; name: string };

export function KanbanBoard({
  tasks,
  users,
  currentUserId,
  isAdmin,
}: {
  tasks: TaskCard[];
  users: UserOption[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Re-rendering snaps a controlled <select> back to the saved assignee after
  // a cancelled or failed reassign.
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  function setError(taskId: string, message: string) {
    setErrors((prev) => ({ ...prev, [taskId]: message }));
  }

  function clearError(taskId: string) {
    setErrors((prev) => {
      if (!(taskId in prev)) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  async function patchTask(taskId: string, payload: Record<string, unknown>) {
    setPendingId(taskId);
    clearError(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(taskId, data.error ?? "Could not update this task.");
        return;
      }
      router.refresh();
    } catch {
      setError(taskId, "Network error — the task was not updated.");
    } finally {
      setPendingId(null);
    }
  }

  function updateTask(taskId: string, status: string) {
    void patchTask(taskId, { status });
  }

  function reassignTask(task: TaskCard, assigneeId: string | null) {
    // Non-admins only see tasks assigned to them, so handing one off makes the
    // card vanish from their board. Say so before it happens.
    const leavingMyBoard =
      !isAdmin &&
      task.assignee?.id === currentUserId &&
      assigneeId !== currentUserId;

    if (leavingMyBoard) {
      const target = assigneeId
        ? (users.find((u) => u.id === assigneeId)?.name ?? "someone else")
        : "nobody (unassigned)";
      const confirmed = confirm(
        `Hand "${task.title}" over to ${target}?\n\nYou only see tasks assigned to you, so this card will disappear from your board and only an admin can hand it back.`,
      );
      if (!confirmed) {
        forceRender();
        return;
      }
    }

    void patchTask(task.id, { assigneeId });
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    setPendingId(taskId);
    clearError(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(taskId, data.error ?? "Could not delete this task.");
        return;
      }
      router.refresh();
    } catch {
      setError(taskId, "Network error — the task was not deleted.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="kanban-board">
      {TASK_STATUSES.map((column) => {
        const items = tasks.filter((task) => task.status === column.id);
        return (
          <section key={column.id} className="kanban-column">
            <header className="kanban-column-header">
              <p className="project-kicker">{String(items.length).padStart(2, "0")}</p>
              <h3 className="kanban-column-title">{column.label}</h3>
            </header>

            <div className="kanban-column-body">
              {items.map((task) => {
                const busy = pendingId === task.id;
                const error = errors[task.id];
                return (
                  <article key={task.id} className="kanban-card">
                    <h4 className="kanban-card-title">{task.title}</h4>
                    <p className="kanban-card-assignee">
                      {task.assignee?.name ?? "Unassigned"}
                    </p>
                    <dl className="kanban-card-meta">
                      <div>
                        <dt>Created</dt>
                        <dd>{formatTime(task.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Status updated</dt>
                        <dd>{formatTime(task.statusUpdatedAt)}</dd>
                      </div>
                    </dl>

                    {users.length > 0 ? (
                      <label className="mt-2 block text-[11px] text-[var(--muted)]">
                        Reassign
                        <select
                          value={task.assignee?.id ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            reassignTask(
                              task,
                              e.target.value ? e.target.value : null,
                            )
                          }
                          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--accent)] disabled:opacity-50"
                          aria-label={`Reassign task ${task.title}`}
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {error ? (
                      <p className="kanban-card-error" role="alert">
                        {error}
                      </p>
                    ) : null}

                    <div className="kanban-card-actions">
                      <p className="kanban-actions-label">Move to</p>
                      <div className="kanban-pills">
                        {TASK_STATUSES.map((item) => {
                          const active = item.id === task.status;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => updateTask(task.id, item.id)}
                              disabled={active || busy}
                              className={
                                active ? "kanban-pill is-active" : "kanban-pill"
                              }
                              aria-current={active ? "true" : undefined}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteTask(task.id)}
                        disabled={busy}
                        className="kanban-delete"
                      >
                        Delete task
                      </button>
                    </div>
                  </article>
                );
              })}

              {items.length === 0 ? (
                <p className="kanban-empty">Nothing here yet</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
