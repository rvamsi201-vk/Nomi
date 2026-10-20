"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardTopBar } from "@/components/dashboard-topbar";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)]">
      <button
        type="button"
        className={`sidebar-backdrop ${open ? "is-visible" : ""}`}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`app-sidebar flex w-64 shrink-0 flex-col border-r border-[var(--border)] ${open ? "is-open" : ""}`}
      >
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar
          onMenuToggle={() => setOpen((v) => !v)}
          menuOpen={open}
        />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
