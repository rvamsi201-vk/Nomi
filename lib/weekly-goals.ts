const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekStartKey(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

export function shiftWeekStart(weekStart: string, weeks: number) {
  const date = parseDateKey(weekStart);
  date.setDate(date.getDate() + weeks * 7);
  return toDateKey(date);
}

export function weekDayKeys(weekStart: string) {
  const monday = parseDateKey(weekStart);
  return WEEKDAYS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      index,
      label,
      dateKey: toDateKey(date),
      display: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  });
}

export function todayDayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export { WEEKDAYS };
