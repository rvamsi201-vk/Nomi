import { Fragment } from "react";

const TEXT_EXT = new Set(["txt", "md", "csv"]);

export function isPreviewableFile(
  fileName?: string | null,
  mimeType?: string | null,
) {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = (fileName?.split(".").pop() ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("text/") || TEXT_EXT.has(ext)) return "text";
  return null;
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachment({
  channelId,
  messageId,
  fileName,
  mimeType,
  sizeBytes,
}: {
  channelId: string;
  messageId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}) {
  const base = `/api/channels/${channelId}/messages/${messageId}/file`;
  const previewUrl = `${base}?inline=1`;
  const downloadUrl = base;
  const kind = isPreviewableFile(fileName, mimeType);
  const size = formatFileSize(sizeBytes);

  return (
    <div className="chat-attachment">
      <div className="chat-attachment-meta">
        <span className="chat-attachment-name">{fileName}</span>
        {size ? <span className="chat-attachment-size">{size}</span> : null}
      </div>

      {kind === "image" ? (
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={previewUrl}
            alt={fileName}
            className="chat-attachment-image"
          />
        </a>
      ) : null}

      {kind === "pdf" ? (
        <iframe
          src={previewUrl}
          title={fileName}
          className="chat-attachment-pdf"
        />
      ) : null}

      {kind === "text" ? (
        <iframe
          src={previewUrl}
          title={fileName}
          className="chat-attachment-text"
        />
      ) : null}

      <div className="chat-attachment-actions">
        {kind ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-btn"
          >
            Preview
          </a>
        ) : null}
        <a href={downloadUrl} className="topbar-btn">
          Download
        </a>
      </div>
    </div>
  );
}

export function ChatAttachments({
  channelId,
  attachments,
}: {
  channelId: string;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }>;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="chat-attachments">
      {attachments.map((file) => (
        <ChatAttachment
          key={file.id}
          channelId={channelId}
          messageId={file.id}
          fileName={file.fileName}
          mimeType={file.mimeType}
          sizeBytes={file.sizeBytes}
        />
      ))}
    </div>
  );
}
