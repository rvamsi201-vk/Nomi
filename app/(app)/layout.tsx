import Link from "next/link";
import { listVisibleChannels } from "@/lib/access";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateChannelForm } from "@/components/create-channel-form";
import { LogoutButton } from "@/components/logout-button";
import { StartDmButton } from "@/components/start-dm-button";
import { DmNav } from "@/components/dm-nav";
import { LiveSession, OnlineDot } from "@/components/live-session";
import { AppShell } from "@/components/app-shell";
import { ChannelNav } from "@/components/channel-nav";
import { UnreadProvider } from "@/components/unread";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const membership = user ? await getMembership(user.id) : null;
  const orgId = membership?.orgId;

  const channels =
    user && orgId && membership
      ? await listVisibleChannels(orgId, user.id, membership.role)
      : [];

  const dmChannels =
    user && orgId
      ? await prisma.channel.findMany({
          where: {
            organizationId: orgId,
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

  const teammates =
    user && orgId
      ? (
          await prisma.orgMember.findMany({
            where: { orgId, userId: { not: user.id } },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { userId: "asc" },
          })
        ).map((m) => m.user)
      : [];

  const dms = dmChannels.map((channel) => {
    const other = channel.members.find((m) => m.userId !== user!.id)?.user;
    return {
      id: channel.id,
      slug: channel.slug,
      name: other?.name ?? "DM",
      otherUserId: other?.id ?? null,
    };
  });

  const sidebar = (
    <>
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-[var(--accent)] text-sm font-bold">
              N
            </div>
            <div>
              <p className="font-semibold">Nomi</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {membership?.org.name ?? "Team workspace"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Channels
          </p>
          <ChannelNav channels={channels} />
          {membership?.role === "admin" ? (
            <div className="mt-2">
              <CreateChannelForm />
            </div>
          ) : null}

          <p className="mb-2 mt-6 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Direct messages
          </p>
          <DmNav dms={dms} />
          <div className="mt-2">
            <StartDmButton users={teammates} />
          </div>

          <p className="mb-2 mt-6 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Workspace
          </p>
          <nav className="space-y-0.5">
            <Link href="/projects" className="nav-link">
              Projects
            </Link>
            <Link href="/tasks" className="nav-link">
              Tasks
            </Link>
            <Link href="/notes" className="nav-link">
              Notes
            </Link>
            <Link href="/docs" className="nav-link">
              Docs
            </Link>
            <Link href="/team" className="nav-link">
              Team
            </Link>
            <Link href="/timesheet" className="nav-link">
              Time Sheet
            </Link>
            <Link href="/settings" className="nav-link">
              Settings
            </Link>
          </nav>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-medium">
            <OnlineDot userId={user?.id} label={user?.name} />
            {user?.name}
          </p>
          <p className="mb-1 truncate text-xs text-[var(--muted)]">{user?.email}</p>
          {membership ? (
            <p className="mb-3 text-[11px] capitalize text-[var(--muted)]">
              {membership.role}
            </p>
          ) : null}
          <LogoutButton />
        </div>
    </>
  );

  const shell = <AppShell sidebar={sidebar}>{children}</AppShell>;

  if (!user) return shell;
  return (
    <LiveSession currentUserId={user.id}>
      <UnreadProvider>{shell}</UnreadProvider>
    </LiveSession>
  );
}
