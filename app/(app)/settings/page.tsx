import { requireUser } from "@/lib/auth";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await requireUser();

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

        <div className="max-w-2xl border-t border-[var(--border)] pt-8">
          <SettingsForm initialEmail={user.email} />
        </div>
      </div>
    </div>
  );
}
