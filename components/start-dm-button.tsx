"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Teammate = { id: string; name: string; email: string };

export function StartDmButton({ users }: { users: Teammate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function startDm(userId: string) {
    setLoading(true);
    const res = await fetch("/api/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    if (!res.ok) return;
    const dm = await res.json();
    setOpen(false);
    router.push(`/chat/${dm.slug}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--muted)] hover:bg-white/5 hover:text-zinc-200"
      >
        + Message someone
      </button>
    );
  }

  return (
    <div className="space-y-1 px-1">
      {users.length === 0 ? (
        <p className="px-2 text-xs text-[var(--muted)]">No teammates yet</p>
      ) : (
        users.map((person) => (
          <button
            key={person.id}
            type="button"
            disabled={loading}
            onClick={() => startDm(person.id)}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
          >
            {person.name}
          </button>
        ))
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-3 py-1 text-xs text-[var(--muted)]"
      >
        Cancel
      </button>
    </div>
  );
}
