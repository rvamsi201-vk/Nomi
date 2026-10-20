import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <p className="auth-wordmark">Nomi / Workspace</p>
        <h1 className="auth-statement">Work stays clear when the space does.</h1>
        <p className="auth-note">Channels · Projects · Tasks</p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="mb-12 border-b border-[var(--border)] pb-6">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Welcome back</p>
            <h2 className="text-3xl font-normal tracking-[-0.04em]">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Continue to your workspace.</p>
          </div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
