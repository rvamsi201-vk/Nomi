import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeamPanel } from "@/components/team-panel";

export default async function TeamPage() {
  const { user, org, membership } = await requireMembership();

  const members = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { userId: "asc" }],
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-[var(--border)] px-8 py-6">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {org.name} — manage who can access this workspace
        </p>
      </header>

      <TeamPanel
        orgName={org.name}
        currentRole={membership.role}
        currentUserId={user.id}
        initialMembers={members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        }))}
      />
    </div>
  );
}
