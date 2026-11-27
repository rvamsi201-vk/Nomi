import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getNomiraUser } from "@/lib/nomira-agent";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const nomira = await getNomiraUser();

  return (
    <div className="h-full overflow-y-auto">
      <div className="project-shell px-6 py-10 md:px-10 md:py-14 xl:px-16 xl:py-20">
        <header className="mb-14 max-w-3xl md:mb-20">
          <p className="project-kicker">Account</p>
          <h1 className="mt-5 text-4xl font-normal tracking-[-0.05em] md:text-6xl">
            Settings
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            Keep your sign-in details current. Your existing password is
            required before any account change is saved.
          </p>
        </header>

        <div className="mb-12 max-w-2xl border border-[var(--border)] p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Workspace AI
          </p>
          <h2 className="mt-2 text-xl font-medium">Nomira</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Nomira is available to every member in the sidebar under{" "}
            <Link href="/nomira" className="underline">
              Nomira AI
            </Link>
            , or by starting a DM with{" "}
            <strong>{nomira?.name ?? "nomira"}</strong>
            {nomira ? ` (${nomira.email})` : ""}. She runs on this server via
            Codex + Nomi MCP tools — not from Account settings.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Claude.ai / Chrome remote MCP:{" "}
            <code className="text-[var(--fg)]">
              https://nomi.exora.solutions/mcp
            </code>{" "}
            with an Authorization Bearer token (admin).
          </p>
          <p className="mt-3 text-sm">
            Status:{" "}
            {nomira ? (
              <span className="text-emerald-700">ready</span>
            ) : (
              <span className="text-amber-700">bot user missing</span>
            )}{" "}
            · engine {process.env.NOMIRA_ENGINE || "codex"}
          </p>
        </div>

        <div className="max-w-2xl border-t border-[var(--border)] pt-8">
          <SettingsForm initialEmail={user.email} />
        </div>
      </div>
    </div>
  );
}
