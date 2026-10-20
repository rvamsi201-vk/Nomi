"use client";

import { useEffect, useRef, useState } from "react";

export type StickyNoteData = {
  id: string;
  dateKey: string;
  body: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

const COLORS = [
  { id: "butter", label: "Butter" },
  { id: "mint", label: "Mint" },
  { id: "blush", label: "Blush" },
  { id: "sky", label: "Sky" },
  { id: "lilac", label: "Lilac" },
] as const;

const DEFAULT_WIDTH = 210;
const DEFAULT_HEIGHT = 190;
const MIN_WIDTH = 180;
const MIN_HEIGHT = 150;
const MAX_WIDTH = 560;
const MAX_HEIGHT = 560;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type Props = {
  note: StickyNoteData;
  onChange: (note: StickyNoteData) => void;
  onDelete: (id: string) => void;
};

export function StickyNoteCard({ note, onChange, onDelete }: Props) {
  const [body, setBody] = useState(note.body);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyVersion = useRef(0);
  const latest = useRef(note);
  // Board geometry captured when a gesture starts, so pointer coordinates
  // (viewport-based) can be converted to board-relative coordinates.
  const boardRect = useRef<DOMRect | null>(null);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const bodyDirty = useRef(false);

  useEffect(() => {
    latest.current = note;
    // Never stomp on text the user is still typing.
    if (!bodyDirty.current) setBody(note.body);
  }, [note]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Apply a server response without yanking the note out from under the
  // pointer: while a gesture is running, local geometry wins.
  function applyServerNote(updated: StickyNoteData) {
    const next =
      draggingRef.current || resizingRef.current
        ? {
            ...updated,
            x: latest.current.x,
            y: latest.current.y,
            width: latest.current.width,
            height: latest.current.height,
          }
        : updated;
    latest.current = next;
    onChange(next);
  }

  async function patch(payload: Record<string, unknown>, sentBodyVersion?: number) {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const updated: StickyNoteData = await res.json();
    // Only clear dirty/apply the server body if no newer edit was queued
    // while this request was in flight — otherwise a slow response can
    // stomp text the user is still typing.
    if (payload.body !== undefined && sentBodyVersion === bodyVersion.current) {
      bodyDirty.current = false;
    }
    applyServerNote(updated);
  }

  function queueBodySave(nextBody: string) {
    setBody(nextBody);
    bodyDirty.current = true;
    const version = ++bodyVersion.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void patch({ body: nextBody }, version);
    }, 450);
  }

  function boardOf(el: Element | null | undefined) {
    return (el?.closest(".sticky-note")?.parentElement ?? null) as HTMLElement | null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("textarea,button,select,.sticky-note-resize")) return;
    const board = e.currentTarget.parentElement;
    if (!board) return;
    boardRect.current = board.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - boardRect.current.left - latest.current.x,
      y: e.clientY - boardRect.current.top - latest.current.y,
    };
    void patch({ bringToFront: true });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const rect = boardRect.current;
    if (!rect) return;
    const width = latest.current.width ?? DEFAULT_WIDTH;
    const height = latest.current.height ?? DEFAULT_HEIGHT;
    const nextX = clamp(
      e.clientX - rect.left - dragOffset.current.x,
      0,
      Math.max(0, rect.width - width),
    );
    const nextY = clamp(
      e.clientY - rect.top - dragOffset.current.y,
      0,
      Math.max(0, rect.height - height),
    );
    const next = { ...latest.current, x: nextX, y: nextY };
    latest.current = next;
    onChange(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    void patch({
      x: latest.current.x,
      y: latest.current.y,
      bringToFront: true,
    });
  }

  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const board = boardOf(e.currentTarget);
    boardRect.current = board ? board.getBoundingClientRect() : null;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizingRef.current = true;
    setResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: latest.current.width ?? DEFAULT_WIDTH,
      height: latest.current.height ?? DEFAULT_HEIGHT,
    };
    void patch({ bringToFront: true });
  }

  function onResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizingRef.current) return;
    e.stopPropagation();
    const rect = boardRect.current;
    let nextWidth = resizeStart.current.width + (e.clientX - resizeStart.current.x);
    let nextHeight = resizeStart.current.height + (e.clientY - resizeStart.current.y);
    nextWidth = clamp(nextWidth, MIN_WIDTH, MAX_WIDTH);
    nextHeight = clamp(nextHeight, MIN_HEIGHT, MAX_HEIGHT);
    if (rect) {
      nextWidth = Math.max(MIN_WIDTH, Math.min(nextWidth, rect.width - latest.current.x));
      nextHeight = Math.max(MIN_HEIGHT, Math.min(nextHeight, rect.height - latest.current.y));
    }
    const next = { ...latest.current, width: nextWidth, height: nextHeight };
    latest.current = next;
    onChange(next);
  }

  function onResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizingRef.current) return;
    e.stopPropagation();
    resizingRef.current = false;
    setResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    void patch({
      width: latest.current.width,
      height: latest.current.height,
      bringToFront: true,
    });
  }

  return (
    <div
      className={`sticky-note color-${note.color}${dragging ? " is-dragging" : ""}${resizing ? " is-resizing" : ""}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width ?? DEFAULT_WIDTH,
        height: note.height ?? DEFAULT_HEIGHT,
        zIndex: note.zIndex,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      <div className="sticky-note-toolbar">
        <span className="sticky-note-grip" aria-hidden>
          ⋮⋮
        </span>
        <select
          value={note.color}
          onChange={(e) => patch({ color: e.target.value })}
          className="sticky-note-color"
          aria-label="Note color"
        >
          {COLORS.map((color) => (
            <option key={color.id} value={color.id}>
              {color.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="sticky-note-delete"
          onClick={() => {
            if (confirm("Delete this sticky note?")) onDelete(note.id);
          }}
        >
          ×
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => queueBodySave(e.target.value)}
        placeholder="Jot something down…"
        className="sticky-note-body"
        rows={7}
      />
      <div
        className="sticky-note-resize"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        onLostPointerCapture={onResizePointerUp}
        aria-hidden
      />
    </div>
  );
}
