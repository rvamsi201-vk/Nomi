"use client";

import { useState } from "react";

export function SettingsForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, currentPassword, newPassword }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save settings");
      return;
    }

    setEmail(data.email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Account settings updated");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <section>
        <p className="project-kicker">Email</p>
        <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">
          Sign-in email
        </h2>
        <label className="mt-7 block">
          <span className="mb-2 block text-xs text-[var(--muted)]">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="w-full py-3 text-base outline-none"
          />
        </label>
      </section>

      <section className="border-t border-[var(--border)] pt-8">
        <p className="project-kicker">Password</p>
        <h2 className="mt-3 text-2xl font-normal tracking-[-0.035em]">
          Change password
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Leave the new password fields empty to keep your current password.
        </p>
        <div className="mt-7 grid gap-7 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs text-[var(--muted)]">New password</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} className="w-full py-3 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-[var(--muted)]">Confirm new password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} className="w-full py-3 outline-none" />
          </label>
        </div>
      </section>

      <section className="border-t border-[var(--border)] pt-8">
        <label className="block max-w-md">
          <span className="mb-2 block text-xs text-[var(--muted)]">Current password — required to save</span>
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required className="w-full py-3 outline-none" />
        </label>
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button type="submit" disabled={loading} className="bg-[var(--accent)] px-6 py-3 text-sm font-medium disabled:opacity-50">
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
