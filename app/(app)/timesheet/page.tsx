import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TimesheetPanel } from "@/components/timesheet-panel";

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

function serializeEntry<
  T extends {
    id: string;
    userId: string;
    work: string;
    startedAt: Date;
    endedAt: Date | null;
    user: { id: string; name: string; email: string };
  },
>(entry: T) {
  return {
    id: entry.id,
    userId: entry.userId,
    work: entry.work,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt ? entry.endedAt.toISOString() : null,
    user: entry.user,
  };
}

export default async function TimesheetPage() {
  const { user, org, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const fromKey = toDateKey(weekStart);
  const toKey = toDateKey(weekEnd);
  const from = new Date(`${fromKey}T00:00:00.000Z`);
  const to = new Date(`${toKey}T23:59:59.999Z`);

  const [openEntry, entries, members] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: {
        organizationId: org.id,
        userId: user.id,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: {
        organizationId: org.id,
        ...(isAdmin ? {} : { userId: user.id }),
        startedAt: { gte: from, lte: to },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
    isAdmin
      ? prisma.orgMember.findMany({
          where: { orgId: org.id },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { userId: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-4 text-4xl font-normal tracking-[-0.05em] md:text-5xl">
            Time Sheet
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            Say what you are working on, then start. Timestamps are recorded
            automatically{isAdmin ? ", and you can review the whole team" : ""}.
          </p>
        </header>

        <TimesheetPanel
          role={membership.role}
          currentUserId={user.id}
          teammates={members.map((m) => m.user)}
          initialOpen={openEntry ? serializeEntry(openEntry) : null}
          initialEntries={entries.map(serializeEntry)}
          initialFrom={fromKey}
          initialTo={toKey}
        />
      </div>
    </div>
  );
}
