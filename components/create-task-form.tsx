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
      setError(data.error ?? "Failed to create task");
      return;
    }

    setTitle("");
    setAssigneeId("");
    setStatus("todo");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
    >
      <h2 className="text-sm font-medium">Add task</h2>
      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none"
        >
          {TASK_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add task"}
        </button>
      </div>
    </form>
  );
}
