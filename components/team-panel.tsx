"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnlineDot } from "@/components/live-session";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function TeamPanel({
  orgName,
  currentRole,
  currentUserId,
  initialMembers,
}: {
  orgName: string;
  currentRole: string;
  currentUserId: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const isAdmin = currentRole === "admin";
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [roleError, setRoleError] = useState("");
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add employee");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    router.refresh();
  }

  async function changeRole(userId: string, nextRole: string) {
    setRoleError("");
    setUpdatingRoleId(userId);
    const previous = members.find((m) => m.id === userId)?.role;
    setMembers((current) =>
      current.map((member) =>
        member.id === userId ? { ...member, role: nextRole } : member,
      ),
    );

    const res = await fetch(`/api/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    setUpdatingRoleId(null);

    if (!res.ok) {
      const data = await res.json();
      setRoleError(data.error ?? "Failed to update role");
      if (previous) {
        setMembers((current) =>
          current.map((member) =>
            member.id === userId ? { ...member, role: previous } : member,
          ),
        );
      }
      return;
    }

    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this person from the workspace?")) return;
    setRoleError("");
    const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setRoleError(data.error ?? "Failed to remove member");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 p-8 xl:grid-cols-[360px_1fr]">
      {isAdmin ? (
        <form
          onSubmit={addEmployee}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <h2 className="text-sm font-medium">Add employee</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            They join {orgName} and get access to channels, projects, and tasks.
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              required
              minLength={6}
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2 text-sm outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add to workspace"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
          Only admins can add employees. Ask your workspace admin if you need
          someone invited.
        </div>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-medium">People ({members.length})</h2>
        </div>
        {roleError ? (
          <p className="border-b border-[var(--border)] px-5 py-3 text-sm text-rose-400">
            {roleError}
          </p>
        ) : null}
        <ul className="divide-y divide-[var(--border)]">
          {members.map((member) => (
            <li
              key={member.id}
              className="team-member-row flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-2">
                <OnlineDot userId={member.id} label={member.name} />
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-[var(--muted)]">{member.email}</p>
                </div>
              </div>
              <div className="team-member-actions flex items-center gap-3">
                {isAdmin && member.id !== currentUserId ? (
                  <select
                    value={member.role}
                    disabled={updatingRoleId === member.id}
                    onChange={(e) => void changeRole(member.id, e.target.value)}
                    className="rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs capitalize outline-none focus:border-[var(--accent)] disabled:opacity-50"
                    aria-label={`Role for ${member.name}`}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs capitalize text-zinc-300">
                    {member.role}
                    {member.id === currentUserId ? " · you" : ""}
                  </span>
                )}
                {isAdmin && member.id !== currentUserId ? (
                  <button
                    type="button"
                    onClick={() => void removeMember(member.id)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
