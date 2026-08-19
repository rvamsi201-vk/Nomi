"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }
    router.push(searchParams.get("next") || "/chat");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-zinc-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f1117] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Need a new company workspace?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Create workspace
        </Link>
      </p>
    </form>
  );
}
