"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatAttachment } from "@/components/chat-attachment";
import { LinkifiedText } from "@/components/linkified-text";
import { formatTime } from "@/lib/utils";
import { OnlineDot } from "@/components/live-session";
import { useUnread } from "@/components/unread";

type Message = {
  id: string;
  text: string;
  createdAt: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  user: { id: string; name: string };
};

export function ChatRoom({
  channelId,
  channelName,
  channelType = "public",
  initialMessages,
  currentUserId,
  otherUserId,
}: {
  channelId: string;
  channelName: string;
  channelType?: "public" | "private" | "dm";
  initialMessages: Message[];
  currentUserId: string;
  otherUserId?: string | null;
}) {
  const router = useRouter();
  const { markRead } = useUnread();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(initialMessages.at(-1)?.createdAt ?? "");

  useEffect(() => {
    setMessages(initialMessages);
    latestRef.current = initialMessages.at(-1)?.createdAt ?? "";
  }, [channelId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    markRead(channelId);
  }, [channelId, markRead]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const after = latestRef.current
        ? `?after=${encodeURIComponent(latestRef.current)}`
        : "";
      const res = await fetch(`/api/channels/${channelId}/messages${after}`);
      if (!res.ok) return;
      const newer: Message[] = await res.json();
      if (newer.length === 0) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev, ...newer.filter((m) => !ids.has(m.id))];
        latestRef.current = merged.at(-1)?.createdAt ?? latestRef.current;
        return merged;
      });
      markRead(channelId);
    }, 3000);
    return () => clearInterval(timer);
  }, [channelId, markRead]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value && files.length === 0) return;
    setSending(true);
    const form = new FormData();
    form.set("text", value);
    for (const file of files) {
      form.append("files", file);
    }
    const savedText = value;
    const savedFiles = files;
    setText("");
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";

    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: "POST",
      body: form,
    });
    setSending(false);

    if (!res.ok) {
      setText(savedText);
      setFiles(savedFiles);
      return;
    }

    const payload = await res.json();
    const created: Message[] = payload.messages ?? [payload];
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const next = [...prev, ...created.filter((m) => !ids.has(m.id))];
      latestRef.current = next.at(-1)?.createdAt ?? latestRef.current;
      return next;
    });
    router.refresh();
  }

  function onFilesSelected(list: FileList | null) {
    if (!list) return;
    setFiles(Array.from(list));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileRef.current && files.length <= 1) fileRef.current.value = "";
  }

  const isDm = channelType === "dm";
  const title = isDm ? channelName : `#${channelName}`;
  const subtitle = isDm
    ? "Direct message"
    : channelType === "private"
      ? "Private channel"
      : "Public channel";
  const placeholder = isDm
    ? `Message ${channelName}`
    : `Message #${channelName}`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="chat-header border-b border-[var(--border)] px-6 py-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {isDm ? <OnlineDot userId={otherUserId} label={channelName} /> : null}
          {title}
        </h1>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </header>

      <div className="chat-messages flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className={
                  message.user.id === currentUserId
                    ? "chat-author chat-author-me"
                    : "chat-author"
                }
              >
                {message.user.name}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {formatTime(message.createdAt)}
              </span>
            </div>
            {message.text && !message.fileName ? (
              <p className="chat-body whitespace-pre-wrap">
                <LinkifiedText text={message.text} />
              </p>
            ) : null}
            {message.text && message.fileName && !message.text.startsWith("Shared ") ? (
              <p className="chat-body whitespace-pre-wrap">
                <LinkifiedText text={message.text} />
              </p>
            ) : null}
            {message.fileName ? (
              <ChatAttachment
                channelId={channelId}
                messageId={message.id}
                fileName={message.fileName}
                mimeType={message.mimeType}
                sizeBytes={message.sizeBytes}
              />
            ) : null}
          </div>
        ))}
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello!
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="chat-compose border-t border-[var(--border)] p-4">
        <div className="chat-compose-row flex items-end gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending && (text.trim() || files.length > 0)) {
                  e.currentTarget.form?.requestSubmit();
                }
              }
            }}
            placeholder={placeholder}
            rows={2}
            className="max-h-40 min-h-12 w-full flex-1 resize-y px-0 py-3 text-sm outline-none"
          />
          <div className="chat-compose-actions">
            <label className="topbar-btn cursor-pointer">
              Attach
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
            </label>
            <button
              type="submit"
              disabled={sending || (!text.trim() && files.length === 0)}
              className="bg-[var(--accent)] px-5 py-3 text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
        {files.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]"
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="chat-compose-hint mt-2 text-[11px] text-[var(--muted)]">
          Enter to send · Shift + Enter for a new line · Attach up to 10 files
        </p>
      </form>
    </div>
  );
}
