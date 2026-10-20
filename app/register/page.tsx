import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <p className="auth-wordmark">Nomi / Workspace</p>
        <h1 className="auth-statement">One place for the work that matters.</h1>
        <p className="auth-note">Private by default · Built for teams</p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="mb-10 border-b border-[var(--border)] pb-6">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">First step</p>
            <h2 className="text-3xl font-normal tracking-[-0.04em]">Create workspace</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">The first account becomes the administrator.</p>
          </div>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
