import Link from "next/link";
import { CreateProjectForm } from "@/components/create-project-form";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/auth";

export default async function ProjectsPage() {
  const { user, org, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  const projects = await prisma.project.findMany({
    where: {
      organizationId: org.id,
      ...(isAdmin ? {} : { members: { some: { userId: user.id } } }),
    },
    include: {
      owner: { select: { name: true } },
      channel: { select: { slug: true, name: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            Projects
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {isAdmin
              ? "Every workstream in the workspace. Assign people on each project so they can add and own tasks."
              : "Projects you have been added to. You only see tasks assigned to you."}
          </p>
        </header>

        {isAdmin ? <CreateProjectForm /> : null}

        <section className="mt-16">
          <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="project-kicker">Portfolio</p>
              <h2 className="mt-2 text-xl font-medium">
                {isAdmin ? "All projects" : "Your projects"}
              </h2>
            </div>
            <span className="text-sm text-[var(--muted)]">
              {projects.length.toString().padStart(2, "0")}
            </span>
          </div>
          <div>
            {projects.map((project, index) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group grid gap-5 border-b border-[var(--border)] py-8 md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-start md:py-10"
              >
                <span className="pt-1 text-xs text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-2xl font-normal tracking-[-0.035em] transition group-hover:text-[var(--accent)]">
                    {project.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {project.description || "No description yet."}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                    <span>{project.owner.name}</span>
                    <span>{project._count.tasks} tasks</span>
                    <span>{project._count.members} members</span>
                    <span>
                      {project.channel ? `#${project.channel.name}` : "No channel"}
                    </span>
                  </div>
                </div>
                <span className="project-link pt-1 text-sm">Open →</span>
              </Link>
            ))}
            {projects.length === 0 ? (
              <div className="border-b border-[var(--border)] py-20 text-center text-[var(--muted)]">
                {isAdmin
                  ? "No projects yet. Create the first workstream."
                  : "You have not been added to any projects yet."}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
