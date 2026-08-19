import Link from "next/link";
import { CreateProjectForm } from "@/components/create-project-form";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/auth";

export default async function ProjectsPage() {
  const { org } = await requireMembership();

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    include: {
      owner: { select: { name: true } },
      channel: { select: { slug: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-[var(--border)] px-8 py-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Track workstreams inside {org.name}
        </p>
      </header>

      <div className="grid gap-6 p-8 xl:grid-cols-[320px_1fr]">
        <CreateProjectForm />

        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:border-[var(--accent)]"
            >
              <h2 className="text-lg font-medium">{project.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {project.description || "No description"}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
                <span>Owner: {project.owner.name}</span>
                <span>{project._count.tasks} tasks</span>
                {project.channel ? (
                  <span>#{project.channel.name}</span>
                ) : (
                  <span>No channel</span>
                )}
              </div>
            </Link>
          ))}

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
              No projects yet. Create your first one.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
