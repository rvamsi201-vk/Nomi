"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="w-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-rose-400 hover:text-rose-600"
    >
      Sign out
    </button>
  );
}
