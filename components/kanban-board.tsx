"use client";

import { useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUSES } from "@/lib/constants";
import { MAX_PASTED_TASKS, parseTaskList } from "@/lib/parse-task-list";
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
  projectId,
  canAddTasks = false,
}: {
  tasks: TaskCard[];
  users: UserOption[];
  currentUserId: string;
  isAdmin: boolean;
  projectId: string;
  canAddTasks?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Re-rendering snaps a controlled <select> back to the saved assignee after
  // a cancelled or failed reassign.
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState("");

  const parsedTitles = useMemo(() => parseTaskList(pasteText), [pasteText]);
  const pasteOverLimit = parsedTitles.length > MAX_PASTED_TASKS;
  const pastePreview = pasteOverLimit
    ? parsedTitles.slice(0, MAX_PASTED_TASKS)
    : parsedTitles;

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

  function closePasteModal() {
    if (pasteLoading) return;
    setPasteOpen(false);
    setPasteText("");
    setPasteError("");
  }

  async function submitPasteList() {
    if (parsedTitles.length === 0) {
      setPasteError("Paste at least one task.");
      return;
    }
    if (pasteOverLimit) {
      setPasteError(
        `At most ${MAX_PASTED_TASKS} tasks can be added at once.`,
      );
      return;
    }

    setPasteLoading(true);
    setPasteError("");
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          titles: parsedTitles,
          status: "todo",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPasteError(data.error ?? "Failed to add tasks.");
        return;
      }
      setPasteOpen(false);
      setPasteText("");
      setPasteError("");
      router.refresh();
    } catch {
      setPasteError("Network error — tasks were not added.");
    } finally {
      setPasteLoading(false);
    }
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
    <>
      <div className="kanban-board">
        {TASK_STATUSES.map((column) => {
          const items = tasks.filter((task) => task.status === column.id);
          const showPaste = column.id === "todo" && canAddTasks;
          return (
            <section key={column.id} className="kanban-column">
              <header className="kanban-column-header">
                <div className="kanban-column-header-top">
                  <p className="project-kicker">
                    {String(items.length).padStart(2, "0")}
                  </p>
                  {showPaste ? (
                    <button
                      type="button"
                      className="kanban-paste-btn"
                      onClick={() => setPasteOpen(true)}
                    >
                      Paste list
                    </button>
                  ) : null}
                </div>
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
                                  active
                                    ? "kanban-pill is-active"
                                    : "kanban-pill"
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

      {pasteOpen ? (
        <div className="weekly-goal-overlay" onClick={closePasteModal}>
          <div
            className="paste-list-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="paste-list-title"
          >
            <header className="weekly-goal-header">
              <div>
                <p className="project-kicker">To Do</p>
                <h2 id="paste-list-title" className="weekly-goal-title">
                  Paste list
                </h2>
                <p className="weekly-goal-subtitle">
                  Paste a numbered list. Each line becomes its own task in To
                  Do.
                </p>
              </div>
              <button
                type="button"
                className="topbar-btn"
                onClick={closePasteModal}
                disabled={pasteLoading}
              >
                Close
              </button>
            </header>

            <label className="paste-list-label">
              <span className="sr-only">Task list</span>
              <textarea
                className="paste-list-textarea"
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setPasteError("");
                }}
                placeholder={`1. Design login\n2. Wire auth\n3. Ship MVP`}
                rows={10}
                disabled={pasteLoading}
                autoFocus
              />
            </label>

            {parsedTitles.length > 0 ? (
              <div className="paste-list-preview">
                <p className="paste-list-preview-count">
                  {pasteOverLimit
                    ? `${parsedTitles.length} lines — max ${MAX_PASTED_TASKS}`
                    : `${parsedTitles.length} ${parsedTitles.length === 1 ? "task" : "tasks"} will be added`}
                </p>
                <ol className="paste-list-preview-items">
                  {pastePreview.slice(0, 8).map((title, i) => (
                    <li key={`${i}-${title}`}>{title}</li>
                  ))}
                  {pastePreview.length > 8 ? (
                    <li className="paste-list-preview-more">
                      +{pastePreview.length - 8} more
                    </li>
                  ) : null}
                </ol>
              </div>
            ) : (
              <p className="paste-list-hint">
                Numbered lines, bullets, or plain lines all work.
              </p>
            )}

            {pasteError ? (
              <p className="paste-list-error" role="alert">
                {pasteError}
              </p>
            ) : null}

            <div className="paste-list-actions">
              <button
                type="button"
                className="topbar-btn"
                onClick={closePasteModal}
                disabled={pasteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="paste-list-submit"
                onClick={() => void submitPasteList()}
                disabled={
                  pasteLoading ||
                  parsedTitles.length === 0 ||
                  pasteOverLimit
                }
              >
                {pasteLoading
                  ? "Adding…"
                  : parsedTitles.length === 0
                    ? "Add tasks"
                    : `Add ${parsedTitles.length} ${parsedTitles.length === 1 ? "task" : "tasks"}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
