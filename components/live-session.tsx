"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const LiveContext = createContext<Set<string>>(new Set());

export function useIsOnline(userId: string | null | undefined) {
  const online = useContext(LiveContext);
  return Boolean(userId && online.has(userId));
}

export function OnlineDot({
  userId,
  label,
}: {
  userId?: string | null;
  label?: string;
}) {
  const online = useIsOnline(userId);
  return (
    <span
      className={`status-dot ${online ? "is-online" : ""}`}
      title={online ? `${label ?? "Active"} now` : "Away"}
      aria-label={online ? "Active" : "Away"}
    />
  );
}

export function LiveSession({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: ReactNode;
}) {
  const [onlineIds, setOnlineIds] = useState<string[]>([currentUserId]);

  useEffect(() => {
    let cancelled = false;
    async function beat() {
      await fetch("/api/presence", { method: "POST" });
      const res = await fetch("/api/presence");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setOnlineIds(data.onlineUserIds ?? []);
    }
    beat();
    const timer = setInterval(beat, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentUserId]);

  const value = useMemo(() => new Set(onlineIds), [onlineIds]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
