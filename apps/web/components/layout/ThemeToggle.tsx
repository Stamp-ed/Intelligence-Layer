"use client";

import { useTheme, useThemeMounted } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useThemeMounted();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {mounted ? (isDark ? "☀" : "☾") : "◐"}
      </span>
      <span className="theme-toggle-label hidden md:inline">
        {mounted ? (isDark ? "Light" : "Dark") : "Theme"}
      </span>
    </button>
  );
}
