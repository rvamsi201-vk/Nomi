"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDocFolderButton({
  folderId,
  hasChildren = false,
}: {
  folderId: string;
  hasChildren?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    const message = hasChildren
      ? "Delete this folder, its subfolders, and all of their files?"
      : "Delete this folder and all of its files?";
    if (!confirm(message)) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/docs/folders/${folderId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete folder");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.parentSlug) {
      router.push(`/docs/${data.parentSlug}`);
    } else {
      router.push("/docs");
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onDelete()}
        className="text-sm text-rose-700 disabled:opacity-50"
      >
        {loading ? "Deleting…" : "Delete folder"}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
