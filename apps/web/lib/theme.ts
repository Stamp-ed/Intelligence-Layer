export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "stamped-theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function resolveInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function getGraphThemeColors() {
  return {
    edge: readCssVar("--graph-edge", "rgba(43, 44, 48, 0.07)"),
    edgeDim: readCssVar("--graph-edge-dim", "rgba(43, 44, 48, 0.04)"),
    edgeActive: readCssVar("--graph-edge-active", "rgba(247, 84, 64, 0.35)"),
    label: readCssVar("--graph-label", "#2b2c30"),
  };
}
