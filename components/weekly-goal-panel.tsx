"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getWeekStartKey,
  shiftWeekStart,
  todayDayIndex,
  weekDayKeys,
} from "@/lib/weekly-goals";

type TaskOption = {
  id: string;
  title: string;
  status: string;
  assignee?: { name: string } | null;
};

type Goal = {
  id: string;
  dayIndex: number;
  taskId: string | null;
  task: TaskOption | null;
};

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function WeeklyGoalPanel({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(getWeekStartKey());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  const weekDays = useMemo(() => weekDayKeys(weekStart), [weekStart]);
  const todayIndex = todayDayIndex();
  const currentWeek = weekStart === getWeekStartKey();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/projects/${projectId}/weekly-goals?week=${weekStart}`,
    );
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setGoals(data.goals);
    setTasks(data.tasks);
  }, [projectId, weekStart]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    const taskId = searchParams.get("weeklyTask");
    const day = searchParams.get("weeklyDay");
    if (!taskId || day === null || appliedRef.current) return;
    appliedRef.current = true;
    setOpen(true);
    void (async () => {
      await fetch(`/api/projects/${projectId}/weekly-goals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: getWeekStartKey(),
          dayIndex: Number(day),
          taskId,
        }),
      });
      router.replace(pathname);
      void load();
    })();
  }, [searchParams, projectId, router, pathname, load]);

  async function assignTask(dayIndex: number, taskId: string) {
    setSavingDay(dayIndex);
    const res = await fetch(`/api/projects/${projectId}/weekly-goals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, dayIndex, taskId: taskId || null }),
    });
    setSavingDay(null);
    if (!res.ok) return;
    const goal: Goal = await res.json();
    setGoals((prev) => {
      const rest = prev.filter((item) => item.dayIndex !== dayIndex);
      return taskId ? [...rest, goal].sort((a, b) => a.dayIndex - b.dayIndex) : rest;
    });
  }

  async function clearDay(dayIndex: number) {
    setSavingDay(dayIndex);
    await fetch(`/api/projects/${projectId}/weekly-goals`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, dayIndex }),
    });
    setSavingDay(null);
    setGoals((prev) => prev.filter((item) => item.dayIndex !== dayIndex));
  }

  function goalForDay(dayIndex: number) {
    return goals.find((goal) => goal.dayIndex === dayIndex)?.task ?? null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="weekly-goal-trigger"
      >
        Weekly goal
      </button>

      {open ? (
        <div className="weekly-goal-overlay" onClick={() => setOpen(false)}>
          <div
            className="weekly-goal-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="weekly-goal-header">
              <div>
                <p className="project-kicker">Weekly focus</p>
                <h2 className="weekly-goal-title">{projectName}</h2>
                <p className="weekly-goal-subtitle">
                  Pick one task per day. These are goals, not new tasks.
                </p>
              </div>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>

            <div className="weekly-goal-nav">
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
              >
                ← Prev week
              </button>
              <span className="weekly-goal-week-label">
                Week of {weekDays[0]?.display} – {weekDays[6]?.display}
                {currentWeek ? " · This week" : ""}
              </span>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
              >
                Next week →
              </button>
            </div>

            {loading ? (
              <p className="weekly-goal-loading">Loading weekly goals…</p>
            ) : (
              <div className="weekly-goal-grid">
                {weekDays.map((day) => {
                  const assigned = goalForDay(day.index);
                  const isToday = currentWeek && day.index === todayIndex;
                  return (
                    <article
                      key={day.dateKey}
                      className={`weekly-goal-day${isToday ? " is-today" : ""}`}
                    >
                      <div className="weekly-goal-day-head">
                        <span className="weekly-goal-day-name">{day.label}</span>
                        <span className="weekly-goal-day-date">{day.display}</span>
                      </div>

                      {assigned ? (
                        <div className="weekly-goal-task-card">
                          <p className="weekly-goal-task-title">{assigned.title}</p>
                          <p className="weekly-goal-task-meta">
                            {STATUS_LABEL[assigned.status] ?? assigned.status}
                            {assigned.assignee?.name
                              ? ` · ${assigned.assignee.name}`
                              : ""}
                          </p>
                          <button
                            type="button"
                            className="weekly-goal-clear"
                            disabled={savingDay === day.index}
                            onClick={() => void clearDay(day.index)}
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <p className="weekly-goal-empty">No goal yet</p>
                      )}

                      <label className="weekly-goal-picker">
                        <span className="weekly-goal-picker-label">
                          {assigned ? "Change task" : "Add task"}
                        </span>
                        <select
                          value={assigned?.id ?? ""}
                          disabled={savingDay === day.index || tasks.length === 0}
                          onChange={(e) =>
                            void assignTask(day.index, e.target.value)
                          }
                        >
                          <option value="">
                            {tasks.length === 0
                              ? "No tasks available"
                              : "Choose a task…"}
                          </option>
                          {tasks.map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
