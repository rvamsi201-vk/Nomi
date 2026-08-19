import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-bold">
            N
          </div>
          <div>
            <h1 className="text-xl font-semibold">Sign in to Nomi</h1>
            <p className="text-sm text-[var(--muted)]">Your company workspace</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
