"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const UnreadContext = createContext<{
  counts: Record<string, number>;
  markRead: (channelId: string) => void;
}>({ counts: {}, markRead: () => {} });

export function useUnread() {
  return useContext(UnreadContext);
}

export function UnreadBadge({ channelId }: { channelId: string }) {
  const { counts } = useUnread();
  const count = counts[channelId] ?? 0;
  if (count < 1) return null;
  return <span className="unread-badge">{count > 99 ? "99+" : count}</span>;
}

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const res = await fetch("/api/unread");
    if (!res.ok) return;
    setCounts(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  const markRead = useCallback((channelId: string) => {
    setCounts((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
    fetch(`/api/channels/${channelId}/read`, { method: "POST" });
  }, []);

  return (
    <UnreadContext.Provider value={{ counts, markRead }}>
      {children}
    </UnreadContext.Provider>
  );
}
