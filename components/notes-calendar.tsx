"use client";

import { useEffect, useMemo, useState } from "react";
import { StickyNoteCard, type StickyNoteData } from "@/components/sticky-note";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NOTE_COLORS = ["butter", "mint", "blush", "sky", "lilac"];

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString([], {
    month: "long",
    year: "numeric",
  });
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number | null }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pad-${i}`, day: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    cells.push({ key, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, day: null });
  }
  return cells;
}

export function NotesCalendar({
  initialDateKey,
}: {
  initialDateKey: string;
}) {
  const initial = parseDateKey(initialDateKey);
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState(initialDateKey);
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const selectedLabel = useMemo(() => {
    return parseDateKey(selectedDate).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const res = await fetch(`/api/notes?month=${monthKey}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setMonthCounts(data);
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [monthKey, notes.length]);

  useEffect(() => {
    let cancelled = false;
    async function loadNotes() {
      setLoading(true);
      const res = await fetch(`/api/notes?date=${selectedDate}`);
      if (!res.ok || cancelled) {
        setLoading(false);
        return;
      }
      const data: StickyNoteData[] = await res.json();
      if (!cancelled) {
        setNotes(data);
        setLoading(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  async function addNote() {
    setCreating(true);
    const color = NOTE_COLORS[notes.length % NOTE_COLORS.length];
    const offset = notes.length * 24;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateKey: selectedDate,
        color,
        x: 48 + offset,
        y: 48 + offset,
      }),
    });
    setCreating(false);
    if (!res.ok) return;
    const note: StickyNoteData = await res.json();
    setNotes((prev) => [...prev, note]);
  }

  async function deleteNote(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  function updateNote(updated: StickyNoteData) {
    setNotes((prev) =>
      prev.map((note) => (note.id === updated.id ? updated : note)),
    );
  }

  const todayKey = toDateKey(new Date());

  return (
    <div className="notes-layout">
      <aside className="notes-calendar-panel">
        <div className="notes-calendar-nav">
          <button type="button" className="topbar-btn" onClick={() => shiftMonth(-1)}>
            ←
          </button>
          <h2 className="notes-month-title">{monthLabel(cursor.year, cursor.month)}</h2>
          <button type="button" className="topbar-btn" onClick={() => shiftMonth(1)}>
            →
          </button>
        </div>

        <div className="notes-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="notes-days">
          {cells.map((cell) => {
            if (cell.day === null) {
              return <span key={cell.key} className="notes-day is-empty" />;
            }
            const count = monthCounts[cell.key] ?? 0;
            const selected = cell.key === selectedDate;
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDate(cell.key)}
                className={[
                  "notes-day",
                  selected ? "is-selected" : "",
                  isToday ? "is-today" : "",
                  count > 0 ? "has-notes" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>{cell.day}</span>
                {count > 0 ? <i className="notes-dot" aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="notes-today-btn"
          onClick={() => {
            const now = new Date();
            setCursor({ year: now.getFullYear(), month: now.getMonth() });
            setSelectedDate(todayKey);
          }}
        >
          Jump to today
        </button>
      </aside>

      <section className="notes-board-panel">
        <header className="notes-board-header">
          <div>
            <p className="project-kicker">Sticky board</p>
            <h2 className="notes-selected-date">{selectedLabel}</h2>
            <p className="notes-hint">
              Personal brainstorming space — not tasks. Drag notes around the board.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addNote()}
            disabled={creating}
            className="bg-[var(--accent)] px-5 py-3 text-sm font-medium disabled:opacity-50"
          >
            {creating ? "Adding…" : "New sticky"}
          </button>
        </header>

        <div className="sticky-board">
          {loading ? (
            <p className="sticky-board-empty">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="sticky-board-empty">
              No notes for this day yet. Add a sticky and start scribbling.
            </p>
          ) : (
            notes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                onChange={updateNote}
                onDelete={(id) => void deleteNote(id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
