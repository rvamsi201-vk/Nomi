"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string };

export function CreateDocFolderForm({
  teammates = [],
  parentId,
  parentName,
}: {
  teammates?: Person[];
  parentId?: string;
  parentName?: string;
}) {
  const router = useRouter();
  const isSubfolder = Boolean(parentId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(userId: string) {
    setMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/docs/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        memberIds: isSubfolder ? [] : memberIds,
        ...(parentId ? { parentId } : {}),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create folder");
      return;
    }
    const folder = await res.json();
    setName("");
    setDescription("");
    setMemberIds([]);
    router.push(`/docs/${folder.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border-y border-[var(--border)] py-8">
      <p className="project-kicker">
        {isSubfolder ? "New subfolder" : "New folder"}
      </p>
      <h2 className="mt-2 text-2xl font-normal tracking-[-0.035em]">
        {isSubfolder
          ? `Create a subfolder${parentName ? ` in ${parentName}` : ""}`
          : "Create a docs folder"}
      </h2>
      {isSubfolder ? (
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Anyone with access to this folder can open the subfolder too.
        </p>
      ) : null}
      <div className="mt-8 grid items-end gap-6 lg:grid-cols-[minmax(220px,1.2fr)_minmax(280px,1.6fr)_auto]">
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isSubfolder ? "e.g. Q4 invoices" : "e.g. Brand assets"}
            required
            className="w-full py-2.5 text-base outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs text-[var(--muted)]">Purpose</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What belongs in this folder?"
            className="w-full py-2.5 text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading
            ? "Creating…"
            : isSubfolder
              ? "Create subfolder"
              : "Create folder"}
        </button>
      </div>
      {!isSubfolder && teammates.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-xs text-[var(--muted)]">
            Share with people (optional — you can change this later)
          </p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {teammates.map((person) => (
              <label
                key={person.id}
                className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={memberIds.includes(person.id)}
                  onChange={() => toggle(person.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {person.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
