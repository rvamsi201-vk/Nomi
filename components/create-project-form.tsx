"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createChannel, setCreateChannel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, createChannel }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create project");
      return;
    }

    const project = await res.json();
    setName("");
    setDescription("");
    router.push(`/projects/${project.slug}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
    >
      <h2 className="text-sm font-medium">New project</h2>
      <div className="mt-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={createChannel}
            onChange={(e) => setCreateChannel(e.target.checked)}
          />
          Create linked #proj channel
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create project"}
        </button>
      </div>
    </form>
  );
}
