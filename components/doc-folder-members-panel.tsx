"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string; email?: string };

export function DocFolderMembersPanel({
  folderId,
  ownerId,
  orgUsers,
  initialMemberIds,
}: {
  folderId: string;
  ownerId: string;
  orgUsers: Person[];
  initialMemberIds: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(initialMemberIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedIds(initialMemberIds);
  }, [initialMemberIds]);

  function toggle(userId: string) {
    if (userId === ownerId) return;
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const memberIds = selectedIds.includes(ownerId)
      ? selectedIds
      : [...selectedIds, ownerId];

    const res = await fetch(`/api/docs/folders/${folderId}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update people");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="border-y border-[var(--border)] py-8">
      <p className="project-kicker">Access</p>
      <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">
        People on this folder
      </h2>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Only people you add can open this folder, its subfolders, and upload
        files.
      </p>

      <div className="mt-6 max-h-56 space-y-1 overflow-y-auto">
        {orgUsers.map((person) => {
          const checked = selectedIds.includes(person.id);
          const isOwner = person.id === ownerId;
          return (
            <label
              key={person.id}
              className="flex cursor-pointer items-center gap-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked || isOwner}
                disabled={isOwner}
                onChange={() => toggle(person.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                {person.name}
                {isOwner ? (
                  <span className="ml-2 text-xs text-[var(--muted)]">owner</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save people"}
        </button>
        {saved ? (
          <span className="text-sm text-[var(--muted)]">Saved</span>
        ) : null}
      </div>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
