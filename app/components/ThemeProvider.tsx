"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type Stored = Theme | "system";

type ThemeContextType = {
  /** Effective theme after applying system if needed */
  resolvedTheme: Theme;
  /** Raw preference: "system" means follow OS */
  preference: Stored;
  /** Toggle between light <-> dark (persists) */
  toggle: () => void;
  /** Explicitly set light or dark (persists) */
  setTheme: (t: Theme) => void;
  /** Clear preference and follow OS again */
  resetToSystem: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  resolvedTheme: "dark",
  preference: "dark",
  toggle: () => {},
  setTheme: () => {},
  resetToSystem: () => {},
});

const STORAGE_KEY = "theme";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ✅ Initialize preference synchronously from localStorage
  const [preference, setPreference] = useState<Stored>(() => {
    if (typeof window === "undefined") return "dark"; // SSR fallback
    const saved = window.localStorage.getItem(STORAGE_KEY) as Stored | null;
    return saved ?? "dark"; // Default to dark instead of system
  });

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    getSystemPrefersDark()
  );

  // Watch system changes only when following system
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolvedTheme: Theme = useMemo(() => {
    if (preference === "system") return systemDark ? "dark" : "light";
    return preference;
  }, [preference, systemDark]);

  // Apply to <html> class
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [resolvedTheme]);

  // Persist preference
  useEffect(() => {
    if (preference === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  }, [preference]);

  const setTheme = (t: Theme) => setPreference(t);
  const resetToSystem = () => setPreference("system");
  const toggle = () =>
    setPreference((prev) => {
      const current =
        prev === "system" ? (systemDark ? "dark" : "light") : prev;
      return current === "dark" ? "light" : "dark";
    });

  return (
    <ThemeContext.Provider
      value={{ resolvedTheme, preference, toggle, setTheme, resetToSystem }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
