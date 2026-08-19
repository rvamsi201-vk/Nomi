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
      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-zinc-300 hover:border-rose-500/40 hover:text-rose-300"
    >
      Sign out
    </button>
  );
}
