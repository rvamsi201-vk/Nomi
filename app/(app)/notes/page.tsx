import { requireMembership } from "@/lib/auth";
import { NotesCalendar } from "@/components/notes-calendar";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function NotesPage() {
  const { org } = await requireMembership();

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-4 text-4xl font-normal tracking-[-0.05em] md:text-5xl">
            Notes
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            Pick a day, drop sticky notes, and capture thoughts without turning
            them into tasks.
          </p>
        </header>

        <NotesCalendar initialDateKey={todayKey()} />
      </div>
    </div>
  );
}
