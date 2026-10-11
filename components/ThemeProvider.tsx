"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "rupala_theme";

function getThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const val = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (val === "light" || val === "dark" || val === "system") return val;
  } catch {}
  return "system";
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

let listeners: Array<() => void> = [];

function subscribe(callback: () => void) {
  listeners.push(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
    mediaQuery.removeEventListener("change", callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function ThemeScript() {
  const scriptContent = `(function() {
    try {
      var stored = localStorage.getItem("${STORAGE_KEY}");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = stored === "dark" || (!stored && prefersDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    } catch (e) {}
  })()`;

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);

  const isClient = typeof window !== "undefined";
  const systemDark = isClient ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  const resolvedTheme: ResolvedTheme = isDark ? "dark" : "light";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, [isDark]);

  const setTheme = (newTheme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      notify();
    } catch {}
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
