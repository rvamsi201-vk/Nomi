import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateDocFolderForm } from "@/components/create-doc-folder-form";
import { DeleteDocFolderButton } from "@/components/delete-doc-folder-button";
import { DocFilesPanel } from "@/components/doc-files-panel";
import { DocFolderMembersPanel } from "@/components/doc-folder-members-panel";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFolder, userCanAccessFolder } from "@/lib/docs";

export default async function DocFolderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user, org, membership } = await requireMembership();
  const { slug } = await params;

  const folder = await prisma.docFolder.findUnique({
    where: { organizationId_slug: { organizationId: org.id, slug } },
    include: {
      owner: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true, slug: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { userId: "asc" },
      },
      children: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { files: true, children: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      files: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!folder) notFound();

  if (!(await userCanAccessFolder(folder, user.id, membership.role))) {
    notFound();
  }

  const canManage = canManageFolder(folder, user.id, membership.role);
  const isRoot = !folder.parentId;

  const orgUsers = (
    await prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { userId: "asc" },
    })
  ).map((member) => member.user);

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-14 max-w-3xl md:mb-20">
          <Link
            href={folder.parent ? `/docs/${folder.parent.slug}` : "/docs"}
            className="project-link text-sm"
          >
            {folder.parent
              ? `← ${folder.parent.name}`
              : "← All folders"}
          </Link>
          <p className="project-kicker mt-10">
            {folder.parent ? "Subfolder" : "Folder"}
          </p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            {folder.name}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {folder.description || "No description yet."}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Owned by {folder.owner.name}
            {folder.parent
              ? ` · Access inherited from ${folder.parent.name}`
              : null}
          </p>
          {canManage ? (
            <div className="mt-6">
              <DeleteDocFolderButton
                folderId={folder.id}
                hasChildren={folder.children.length > 0}
              />
            </div>
          ) : null}
        </header>

        {canManage && isRoot ? (
          <section className="mb-16 max-w-5xl">
            <DocFolderMembersPanel
              folderId={folder.id}
              ownerId={folder.ownerId}
              orgUsers={orgUsers}
              initialMemberIds={folder.members.map((member) => member.userId)}
            />
          </section>
        ) : null}

        {canManage ? (
          <section className="mb-16 max-w-5xl">
            <CreateDocFolderForm
              parentId={folder.id}
              parentName={folder.name}
            />
          </section>
        ) : null}

        {folder.children.length > 0 ? (
          <section className="mb-16">
            <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
              <div>
                <p className="project-kicker">Inside</p>
                <h2 className="mt-2 text-xl font-medium">Subfolders</h2>
              </div>
              <span className="text-sm text-[var(--muted)]">
                {folder.children.length.toString().padStart(2, "0")}
              </span>
            </div>
            <div>
              {folder.children.map((child, index) => (
                <Link
                  key={child.id}
                  href={`/docs/${child.slug}`}
                  className="group grid gap-5 border-b border-[var(--border)] py-8 md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-start md:py-10"
                >
                  <span className="pt-1 text-xs text-[var(--muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-2xl font-normal tracking-[-0.035em] transition group-hover:text-[var(--accent)]">
                      {child.name}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                      {child.description || "No description yet."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                      <span>{child.owner.name}</span>
                      <span>
                        {child._count.files}{" "}
                        {child._count.files === 1 ? "file" : "files"}
                      </span>
                      {child._count.children > 0 ? (
                        <span>
                          {child._count.children}{" "}
                          {child._count.children === 1
                            ? "subfolder"
                            : "subfolders"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="project-link pt-1 text-sm">Open →</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <DocFilesPanel
          folderId={folder.id}
          currentUserId={user.id}
          canDeleteAny={canManage}
          files={folder.files.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            createdAt: file.createdAt.toISOString(),
            user: file.user,
          }))}
        />
      </div>
    </div>
  );
}
