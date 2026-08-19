export const TASK_STATUSES = [
  { id: "backlog", label: "Backlog", color: "bg-zinc-500" },
  { id: "todo", label: "To Do", color: "bg-sky-500" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { id: "done", label: "Done", color: "bg-emerald-500" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["id"];

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((status) => status.id === value);
}
