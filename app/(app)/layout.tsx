import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateChannelForm } from "@/components/create-channel-form";
import { LogoutButton } from "@/components/logout-button";
import { StartDmButton } from "@/components/start-dm-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const channels = user
    ? await prisma.channel.findMany({
        where: {
          type: "public",
          members: { some: { userId: user.id } },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const dmChannels = user
    ? await prisma.channel.findMany({
        where: {
          type: "dm",
          members: { some: { userId: user.id } },
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const teammates = user
    ? await prisma.user.findMany({
        where: { id: { not: user.id } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  const dms = dmChannels.map((channel) => {
    const other = channel.members.find((m) => m.userId !== user!.id)?.user;
    return {
      id: channel.id,
      slug: channel.slug,
      name: other?.name ?? "DM",
    };
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold">
              N
            </div>
            <div>
              <p className="font-semibold">Nomi</p>
              <p className="text-xs text-[var(--muted)]">Team workspace</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Channels
          </p>
          <nav className="space-y-0.5">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/chat/${channel.slug}`}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                # {channel.name}
              </Link>
            ))}
          </nav>
          <div className="mt-2">
            <CreateChannelForm />
          </div>

          <p className="mb-2 mt-6 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Direct messages
          </p>
          <nav className="space-y-0.5">
            {dms.map((dm) => (
              <Link
                key={dm.id}
                href={`/chat/${dm.slug}`}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                · {dm.name}
              </Link>
            ))}
          </nav>
          <div className="mt-2">
            <StartDmButton users={teammates} />
          </div>

          <p className="mb-2 mt-6 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Workspace
          </p>
          <nav className="space-y-0.5">
            <Link
              href="/projects"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Projects
            </Link>
            <Link
              href="/tasks"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Tasks
            </Link>
          </nav>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <p className="mb-1 text-sm font-medium">{user?.name}</p>
          <p className="mb-3 truncate text-xs text-[var(--muted)]">{user?.email}</p>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
