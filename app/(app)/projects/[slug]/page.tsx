import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateTaskForm } from "@/components/create-task-form";
import { KanbanBoard } from "@/components/kanban-board";
import { LinkifiedText } from "@/components/linkified-text";
import { ProjectMembersPanel } from "@/components/project-members-panel";
import { WeeklyGoalPanel } from "@/components/weekly-goal-panel";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user, org, membership } = await requireMembership();
  const { slug } = await params;
  const isAdmin = membership.role === "admin";

  const project = await prisma.project.findUnique({
    where: { organizationId_slug: { organizationId: org.id, slug } },
    include: {
      owner: { select: { id: true, name: true } },
      channel: { select: { slug: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { userId: "asc" },
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  const onProject = project.members.some((m) => m.userId === user.id);
  if (!isAdmin && !onProject) {
    notFound();
  }

  const canAddTasks = isAdmin || onProject;
  const visibleTasks = isAdmin
    ? project.tasks
    : project.tasks.filter((task) => task.assigneeId === user.id);

  const orgUsers = (
    await prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    })
  ).map((m) => m.user);

  const assigneeOptions = project.members.map((m) => m.user);

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-14 max-w-3xl md:mb-20">
          <Link href="/projects" className="project-link text-sm">
            ← All projects
          </Link>
          <p className="project-kicker mt-10">Project</p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            {project.name}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {project.description ? (
              <LinkifiedText text={project.description} />
            ) : (
              "No description yet."
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
            <Link href="/tasks" className="project-link">
              {isAdmin ? "All tasks" : "My tasks"}
            </Link>
            {project.channel ? (
              <Link href={`/chat/${project.channel.slug}`} className="project-link">
                Open #{project.channel.name}
              </Link>
            ) : null}
            <Suspense fallback={null}>
              <WeeklyGoalPanel projectId={project.id} projectName={project.name} />
            </Suspense>
          </div>
        </header>

        <dl className="mb-16 grid border-y border-[var(--border)] sm:grid-cols-3">
          <div className="py-7 sm:border-r sm:border-[var(--border)] sm:pr-8">
            <dt className="project-kicker">Owner</dt>
            <dd className="mt-3 text-xl">{project.owner.name}</dd>
          </div>
          <div className="border-t border-[var(--border)] py-7 sm:border-t-0 sm:border-r sm:px-8">
            <dt className="project-kicker">
              {isAdmin ? "Tasks" : "Your tasks"}
            </dt>
            <dd className="mt-3 text-xl">{visibleTasks.length}</dd>
          </div>
          <div className="border-t border-[var(--border)] py-7 sm:border-t-0 sm:pl-8">
            <dt className="project-kicker">Members</dt>
            <dd className="mt-3 text-xl">{project.members.length}</dd>
          </div>
        </dl>

        {isAdmin ? (
          <section className="mb-16 max-w-5xl">
            <ProjectMembersPanel
              projectId={project.id}
              ownerId={project.ownerId}
              orgUsers={orgUsers}
              initialMemberIds={project.members
                .map((m) => m.userId)
                .filter((id) => orgUsers.some((u) => u.id === id))}
            />
          </section>
        ) : null}

        {canAddTasks ? (
          <section className="mb-16 max-w-5xl">
            <p className="project-kicker">Quick add</p>
            <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">
              Add work to the board
            </h2>
            <div className="mt-8">
              <CreateTaskForm projectId={project.id} users={assigneeOptions} />
            </div>
          </section>
        ) : null}

        <section>
          <p className="project-kicker">Workflow</p>
          <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">Board</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isAdmin
              ? `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`
              : `${visibleTasks.length} assigned to you`}
          </p>
          <div className="mt-10 pb-8">
            <KanbanBoard
              tasks={visibleTasks.map((task) => ({
                id: task.id,
                title: task.title,
                status: task.status,
                createdAt: task.createdAt.toISOString(),
                statusUpdatedAt: task.statusUpdatedAt.toISOString(),
                assignee: task.assignee,
              }))}
              users={assigneeOptions}
              currentUserId={user.id}
              isAdmin={isAdmin}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
