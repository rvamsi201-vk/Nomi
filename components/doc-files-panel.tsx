"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DocFileItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string | Date;
  user: { id: string; name: string };
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocFilesPanel({
  folderId,
  files,
  currentUserId,
  canDeleteAny,
}: {
  folderId: string;
  files: DocFileItem[];
  currentUserId: string;
  canDeleteAny: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    for (const file of Array.from(fileList)) {
      form.append("files", file);
    }
    const res = await fetch(`/api/docs/folders/${folderId}/files`, {
      method: "POST",
      body: form,
    });
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  async function remove(fileId: string) {
    setPendingId(fileId);
    setError("");
    const res = await fetch(`/api/docs/folders/${folderId}/files/${fileId}`, {
      method: "DELETE",
    });
    setPendingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete that file");
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <p className="project-kicker">Files</p>
      <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">
        Documents in this folder
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        PDF, Office, images, audio, video, markdown, csv, and zip — up to 10MB
        each.
      </p>

      <div className="mt-8">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Add files"}
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-10">
        {files.map((file) => {
          const href = `/api/docs/folders/${folderId}/files/${file.id}`;
          const canDelete = canDeleteAny || file.user.id === currentUserId;
          const created =
            typeof file.createdAt === "string"
              ? file.createdAt
              : file.createdAt.toISOString();
          return (
            <div
              key={file.id}
              className="grid gap-3 border-b border-[var(--border)] py-5 md:grid-cols-[minmax(0,1fr)_140px_160px_auto] md:items-center"
            >
              <div>
                <p className="text-base leading-6">{file.fileName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatBytes(file.sizeBytes)} · {file.user.name} ·{" "}
                  {new Date(created).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <a href={`${href}?inline=1`} target="_blank" rel="noreferrer" className="project-link text-sm">
                Open
              </a>
              <a href={href} className="project-link text-sm">
                Download
              </a>
              {canDelete ? (
                <button
                  type="button"
                  disabled={pendingId === file.id}
                  onClick={() => void remove(file.id)}
                  className="justify-self-start text-sm text-rose-700 disabled:opacity-50"
                >
                  {pendingId === file.id ? "Removing…" : "Remove"}
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
        {files.length === 0 ? (
          <p className="border-b border-[var(--border)] py-16 text-center text-[var(--muted)]">
            No files yet. Add the first document.
          </p>
        ) : null}
      </div>
    </section>
  );
}
