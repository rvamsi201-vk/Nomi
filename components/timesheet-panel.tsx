"use client";

import { useEffect, useState } from "react";

type Teammate = { id: string; name: string; email: string };

export type TimeEntryRow = {
  id: string;
  userId: string;
  work: string;
  startedAt: string;
  endedAt: string | null;
  user: { id: string; name: string; email: string };
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function TimesheetPanel({
  role,
  currentUserId,
  teammates,
  initialOpen,
  initialEntries,
  initialFrom,
  initialTo,
}: {
  role: string;
  currentUserId: string;
  teammates: Teammate[];
  initialOpen: TimeEntryRow | null;
  initialEntries: TimeEntryRow[];
  initialFrom: string;
  initialTo: string;
}) {
  const isAdmin = role === "admin";
  const [open, setOpen] = useState<TimeEntryRow | null>(initialOpen);
  const [entries, setEntries] = useState(initialEntries);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [filterUserId, setFilterUserId] = useState("");
  const [work, setWork] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setOpen(initialOpen);
    setEntries(initialEntries);
  }, [initialOpen, initialEntries]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  async function loadEntries(
    nextFrom = from,
    nextTo = to,
    nextUserId = filterUserId,
  ) {
    const params = new URLSearchParams({ from: nextFrom, to: nextTo });
    if (isAdmin && nextUserId) params.set("userId", nextUserId);
    const res = await fetch(`/api/timesheet?${params}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to load entries");
      return;
    }
    const data = (await res.json()) as TimeEntryRow[];
    setEntries(data);
  }

  async function startWork(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = work.trim();
    if (!trimmed) {
      setError("Describe the work before starting");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/timesheet/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work: trimmed }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to start");
      return;
    }
    const entry = (await res.json()) as TimeEntryRow;
    setOpen(entry);
    setWork("");
    setNow(Date.now());
    await loadEntries();
  }

  async function endWork() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/timesheet/end", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to end");
      return;
    }
    setOpen(null);
    await loadEntries();
  }

  async function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await loadEntries();
  }

  function jumpToThisWeek() {
    const weekStart = startOfWeek(new Date());
    const weekEnd = addDays(weekStart, 6);
    const nextFrom = toDateKey(weekStart);
    const nextTo = toDateKey(weekEnd);
    setFrom(nextFrom);
    setTo(nextTo);
    void loadEntries(nextFrom, nextTo, filterUserId);
  }

  const elapsedMs = open
    ? now - new Date(open.startedAt).getTime()
    : 0;

  return (
    <div className="space-y-10">
      <section className="border border-[var(--border)] px-6 py-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          Current session
        </p>
        {open ? (
          <div className="mt-4">
            <p className="text-sm text-[var(--muted)]">
              Started {formatDate(open.startedAt)} at {formatTime(open.startedAt)}
            </p>
            {open.work ? (
              <p className="mt-2 max-w-xl text-base leading-6">{open.work}</p>
            ) : null}
            <p className="mt-3 text-4xl font-normal tracking-[-0.04em] tabular-nums md:text-5xl">
              {formatDuration(elapsedMs)}
            </p>
            <button
              type="button"
              onClick={endWork}
              disabled={loading}
              className="mt-6 bg-[var(--accent)] px-5 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {loading ? "Ending…" : "End work"}
            </button>
          </div>
        ) : (
          <form onSubmit={startWork} className="mt-4 max-w-xl">
            <p className="text-sm text-[var(--muted)]">You are not clocked in.</p>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs text-[var(--muted)]">
                What are you working on?
              </span>
              <input
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="e.g. Fixing login bug, drafting proposal…"
                required
                maxLength={280}
                className="w-full border-b border-[var(--border)] py-2.5 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !work.trim()}
              className="mt-6 bg-[var(--accent)] px-5 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {loading ? "Starting…" : "Start work"}
            </button>
          </form>
        )}
        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-normal tracking-[-0.03em]">History</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isAdmin
                ? "All team sessions in range, or filter by person."
                : "Your sessions for the selected range."}
            </p>
          </div>
          <button
            type="button"
            onClick={jumpToThisWeek}
            className="topbar-btn"
          >
            This week
          </button>
        </div>

        <form
          onSubmit={applyFilters}
          className="mb-6 grid gap-4 border-y border-[var(--border)] py-5 sm:grid-cols-[repeat(2,minmax(0,1fr))_auto] lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
        >
          <label>
            <span className="mb-2 block text-xs text-[var(--muted)]">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="w-full py-2.5 outline-none"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs text-[var(--muted)]">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="w-full py-2.5 outline-none"
            />
          </label>
          {isAdmin ? (
            <label>
              <span className="mb-2 block text-xs text-[var(--muted)]">
                Person
              </span>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="w-full py-2.5 outline-none"
              >
                <option value="">Everyone</option>
                {teammates.map((mate) => (
                  <option key={mate.id} value={mate.id}>
                    {mate.name}
                    {mate.id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-[var(--accent)] px-4 py-2.5 text-sm text-white"
            >
              Apply
            </button>
          </div>
        </form>

        {entries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sessions in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  {isAdmin ? <th className="pb-3 pr-4 font-medium">Person</th> : null}
                  <th className="pb-3 pr-4 font-medium">Work</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Start</th>
                  <th className="pb-3 pr-4 font-medium">End</th>
                  <th className="pb-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const durationMs = entry.endedAt
                    ? new Date(entry.endedAt).getTime() -
                      new Date(entry.startedAt).getTime()
                    : now - new Date(entry.startedAt).getTime();
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--border)]"
                    >
                      {isAdmin ? (
                        <td className="py-3 pr-4">{entry.user.name}</td>
                      ) : null}
                      <td className="max-w-xs py-3 pr-4">
                        {entry.work || (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDate(entry.startedAt)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {formatTime(entry.startedAt)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {entry.endedAt ? formatTime(entry.endedAt) : "—"}
                      </td>
                      <td className="py-3 tabular-nums whitespace-nowrap">
                        {entry.endedAt
                          ? formatDuration(durationMs)
                          : `${formatDuration(durationMs)} (open)`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
