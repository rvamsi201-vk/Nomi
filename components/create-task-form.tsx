"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUSES } from "@/lib/constants";

type UserOption = { id: string; name: string };

export function CreateTaskForm({
  projectId,
  users,
}: {
  projectId: string;
  users: UserOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        status,
        assigneeId: assigneeId || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add task");
      return;
    }
    setTitle("");
    setAssigneeId("");
    setStatus("todo");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border-y border-[var(--border)] py-7">
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(240px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Task</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            className="w-full py-2.5 outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Stage</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full py-2.5 outline-none"
          >
            {TASK_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Owner</span>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full py-2.5 outline-none"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add task"}
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
