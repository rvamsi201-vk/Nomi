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
    <form onSubmit={onSubmit} className="border-y border-[var(--border)] py-8">
      <p className="project-kicker">New workstream</p>
      <h2 className="mt-2 text-2xl font-normal tracking-[-0.035em]">Add a project</h2>
      <div className="mt-8 grid items-end gap-6 lg:grid-cols-[minmax(220px,1.2fr)_minmax(280px,1.6fr)_auto]">
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Autumn launch"
            required
            className="w-full py-2.5 text-base outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Purpose</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this project achieve?"
            className="w-full py-2.5 text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={createChannel}
          onChange={(e) => setCreateChannel(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Also create a linked project channel
      </label>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
