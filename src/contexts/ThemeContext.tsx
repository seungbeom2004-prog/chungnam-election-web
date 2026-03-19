"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = "regular" | "cute";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isCute: boolean;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  theme: "regular",
  setTheme: () => {},
  toggleTheme: () => {},
  isCute: false,
});

const STORAGE_KEY = "theme-mode";

// ─── Provider ───────────────────────────────────────────────────────────────

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: ThemeMode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? "regular");

  // Read from localStorage on mount (client only)
  useEffect(() => {
    if (initialTheme) return; // route-level override takes priority
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "cute" || stored === "regular") {
        setThemeState(stored);
      }
    } catch {
      // SSR or private browsing — ignore
    }
  }, [initialTheme]);

  // Apply CSS class to <html> and persist
  useEffect(() => {
    document.documentElement.classList.toggle("theme-cute", theme === "cute");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // private browsing — ignore
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    import("@/lib/analytics").then(({ trackThemeSwitch }) => trackThemeSwitch(mode)).catch(() => {});
  }, []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => {
      const next = t === "cute" ? "regular" : "cute";
      import("@/lib/analytics").then(({ trackThemeSwitch }) => trackThemeSwitch(next)).catch(() => {});
      return next;
    }),
    [],
  );

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isCute: theme === "cute" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useTheme = () => useContext(ThemeContext);
