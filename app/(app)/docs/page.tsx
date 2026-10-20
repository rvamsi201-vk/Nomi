import Link from "next/link";
import { CreateDocFolderForm } from "@/components/create-doc-folder-form";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/auth";

export default async function DocsPage() {
  const { user, org, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  const folders = await prisma.docFolder.findMany({
    where: {
      organizationId: org.id,
      parentId: null,
      ...(isAdmin
        ? {}
        : {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          }),
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { files: true, members: true, children: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const teammates = isAdmin
    ? (
        await prisma.orgMember.findMany({
          where: { orgId: org.id, userId: { not: user.id } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { userId: "asc" },
        })
      ).map((member) => member.user)
    : [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p className="project-kicker">{org.name}</p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            Docs
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {isAdmin
              ? "Shared folders for files. Create a folder, add people from the team, then drop documents in."
              : "Folders you have been added to. Open one to view and upload files."}
          </p>
        </header>

        {isAdmin ? <CreateDocFolderForm teammates={teammates} /> : null}

        <section className="mt-16">
          <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="project-kicker">Library</p>
              <h2 className="mt-2 text-xl font-medium">
                {isAdmin ? "All folders" : "Your folders"}
              </h2>
            </div>
            <span className="text-sm text-[var(--muted)]">
              {folders.length.toString().padStart(2, "0")}
            </span>
          </div>
          <div>
            {folders.map((folder, index) => (
              <Link
                key={folder.id}
                href={`/docs/${folder.slug}`}
                className="group grid gap-5 border-b border-[var(--border)] py-8 md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-start md:py-10"
              >
                <span className="pt-1 text-xs text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-2xl font-normal tracking-[-0.035em] transition group-hover:text-[var(--accent)]">
                    {folder.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {folder.description || "No description yet."}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                    <span>{folder.owner.name}</span>
                    <span>
                      {folder._count.files}{" "}
                      {folder._count.files === 1 ? "file" : "files"}
                    </span>
                    <span>
                      {folder._count.members}{" "}
                      {folder._count.members === 1 ? "person" : "people"}
                    </span>
                    {folder._count.children > 0 ? (
                      <span>
                        {folder._count.children}{" "}
                        {folder._count.children === 1
                          ? "subfolder"
                          : "subfolders"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="project-link pt-1 text-sm">Open →</span>
              </Link>
            ))}
            {folders.length === 0 ? (
              <div className="border-b border-[var(--border)] py-20 text-center text-[var(--muted)]">
                {isAdmin
                  ? "No folders yet. Create one to start sharing files."
                  : "You have not been added to any folders yet."}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
