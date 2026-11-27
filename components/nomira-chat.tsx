"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
};

const WELCOME =
  "Hi — I'm Nomira. Ask me about projects, tasks, or team chat. I can create tasks, update status, and post updates for you.";

export function NomiraChat({ userName }: { userName: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const storageKey = "nomira-active-conversation";

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/nomira/conversations");
    if (!res.ok) return;
    const data: ConversationSummary[] = await res.json();
    setConversations(data);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/nomira/conversations/${id}`);
    if (!res.ok) return false;
    const data = await res.json();
    setConversationId(data.id);
    setMessages(
      (data.messages || []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }),
      ),
    );
    try {
      localStorage.setItem(storageKey, data.id);
    } catch {
      /* ignore */
    }
    return true;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const res = await fetch("/api/nomira/conversations");
        if (!res.ok) return;
        const data: ConversationSummary[] = await res.json();
        if (cancelled) return;
        setConversations(data);
        let preferred: string | null = null;
        try {
          preferred = localStorage.getItem(storageKey);
        } catch {
          preferred = null;
        }
        if (preferred && data.some((c) => c.id === preferred)) {
          await loadConversation(preferred);
        } else if (data[0]) {
          await loadConversation(data[0].id);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConversation]);

  async function startNewChat() {
    setError(null);
    const res = await fetch("/api/nomira/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New chat" }),
    });
    if (!res.ok) {
      setError("Could not start a new chat");
      return;
    }
    const data = await res.json();
    setConversationId(data.id);
    setMessages(
      (data.messages || [{ role: "assistant", content: WELCOME }]).map(
        (m: { id?: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }),
      ),
    );
    try {
      localStorage.setItem(storageKey, data.id);
    } catch {
      /* ignore */
    }
    await refreshList();
  }

  async function deleteConversation(id: string) {
    const res = await fetch(`/api/nomira/conversations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    if (conversationId === id) {
      setConversationId(null);
      setMessages([{ role: "assistant", content: WELCOME }]);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    await refreshList();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/nomira/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nomira failed");
      }
      if (data.conversationId) {
        setConversationId(data.conversationId);
        try {
          localStorage.setItem(storageKey, data.conversationId);
        } catch {
          /* ignore */
        }
      }
      if (data.conversation?.messages) {
        setMessages(
          data.conversation.messages.map(
            (m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }),
          ),
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: String(data.reply || "") },
        ]);
      }
      await refreshList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nomira failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry — I couldn't finish that (${msg}).`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] p-3">
          <button
            type="button"
            onClick={() => void startNewChat()}
            className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-fg,white)]"
          >
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            History
          </p>
          {loadingList ? (
            <p className="px-2 text-xs text-[var(--muted)]">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 text-xs text-[var(--muted)]">No chats yet</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => {
                const active = c.id === conversationId;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => void loadConversation(c.id)}
                      className={`w-full rounded-md px-3 py-2 pr-8 text-left text-sm ${
                        active
                          ? "bg-[var(--accent)]/15 font-medium"
                          : "hover:bg-[var(--hover)]"
                      }`}
                    >
                      <span className="line-clamp-2">{c.title}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                        {new Date(c.updatedAt).toLocaleString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Delete chat"
                      onClick={() => void deleteConversation(c.id)}
                      className="absolute right-1 top-2 hidden rounded px-1.5 text-xs text-[var(--muted)] hover:text-red-600 group-hover:block"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            AI teammate
          </p>
          <h1 className="text-2xl font-semibold">Nomira</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Chats are saved per user — switch tabs and come back anytime.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {messages.map((m, i) => (
            <div
              key={m.id || `${i}-${m.role}`}
              className={`max-w-3xl rounded-lg px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-[var(--accent)] text-[var(--accent-fg,white)]"
                  : "border border-[var(--border)] bg-[var(--panel)]"
              }`}
            >
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide opacity-70">
                {m.role === "user" ? userName : "Nomira"}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {busy ? (
            <p className="text-sm text-[var(--muted)]">Nomira is working…</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={send}
          className="border-t border-[var(--border)] px-6 py-4"
        >
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask Nomira to list tasks, create work, or update a project…"
              className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg,white)] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
