import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateTaskForm } from "@/components/create-task-form";
import { KanbanBoard } from "@/components/kanban-board";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { org } = await requireMembership();
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: {
      organizationId_slug: { organizationId: org.id, slug },
    },
    include: {
      owner: { select: { name: true } },
      channel: { select: { slug: true, name: true } },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const members = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { userId: "asc" },
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-[var(--border)] px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {project.description || "No description"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/tasks"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]"
            >
              All tasks
            </Link>
            {project.channel ? (
              <Link
                href={`/chat/${project.channel.slug}`}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                Open #{project.channel.name}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Owner
            </p>
            <p className="mt-2 text-lg font-medium">{project.owner.name}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Tasks
            </p>
            <p className="mt-2 text-lg font-medium">{project.tasks.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Channel
            </p>
            <p className="mt-2 text-lg font-medium">
              {project.channel ? `#${project.channel.name}` : "None"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <CreateTaskForm
            projectId={project.id}
            users={members.map((m) => m.user)}
          />
          <div>
            <h2 className="mb-4 text-lg font-medium">Board</h2>
            <KanbanBoard tasks={project.tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
