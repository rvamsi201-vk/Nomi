"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const THEME_KEY = "nomi-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button type="button" onClick={toggle} className="topbar-btn" title="Switch theme">
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

export function DashboardTopBar({
  onMenuToggle,
  menuOpen,
}: {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}) {
  return (
    <header className="dashboard-topbar">
      {onMenuToggle ? (
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuToggle}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      ) : null}
      <div className="topbar-actions">
        <ThemeToggle />
        <Link href="/home" className="topbar-home" title="Home" aria-label="Home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
