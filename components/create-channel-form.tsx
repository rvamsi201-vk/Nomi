"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateChannelForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) return;
    const channel = await res.json();
    setName("");
    setOpen(false);
    router.push(`/chat/${channel.slug}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--muted)] hover:bg-white/5 hover:text-zinc-200"
      >
        + New channel
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 px-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="channel-name"
        autoFocus
        className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-[var(--accent)] px-2 py-1 text-xs disabled:opacity-50"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-[var(--muted)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
