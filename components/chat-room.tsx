"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/utils";

type Message = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string };
};

export function ChatRoom({
  channelId,
  channelName,
  channelType = "public",
  initialMessages,
  currentUserId,
}: {
  channelId: string;
  channelName: string;
  channelType?: "public" | "dm";
  initialMessages: Message[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(initialMessages.at(-1)?.createdAt ?? "");

  useEffect(() => {
    setMessages(initialMessages);
    latestRef.current = initialMessages.at(-1)?.createdAt ?? "";
  }, [channelId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 3 seconds
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
    }, 3000);
    return () => clearInterval(timer);
  }, [channelId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setText("");

    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    setSending(false);

    if (!res.ok) {
      setText(value);
      return;
    }

    const message: Message = await res.json();
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      const next = [...prev, message];
      latestRef.current = message.createdAt;
      return next;
    });
    router.refresh();
  }

  const isDm = channelType === "dm";
  const title = isDm ? channelName : `#${channelName}`;
  const subtitle = isDm ? "Direct message" : "Public channel";
  const placeholder = isDm
    ? `Message ${channelName}`
    : `Message #${channelName}`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.map((message) => {
          const mine = message.user.id === currentUserId;
          return (
            <div key={message.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-sm font-medium ${mine ? "text-[var(--accent)]" : "text-zinc-200"}`}
                >
                  {message.user.name}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">
                {message.text}
              </p>
            </div>
          );
        })}
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello!
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="border-t border-[var(--border)] p-4"
      >
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[#0f1117] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-medium disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
