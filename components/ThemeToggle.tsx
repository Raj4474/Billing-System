"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";

interface ThemeToggleProps {
  variant?: "icon" | "row";
  className?: string;
}

const emptySubscribe = () => () => {};

export default function ThemeToggle({
  variant = "icon",
  className = "",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    if (variant === "row") {
      return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100/70 dark:bg-gray-800/60 ${className}`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-500">
            <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
            <span>Theme</span>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  if (variant === "row") {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-yellow-400 shadow-2xs">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">
              {isDark ? "Dark Mode" : "Light Mode"}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {theme === "system" ? "Auto (System)" : isDark ? "Dark theme active" : "Light theme active"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 dark:bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isDark ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-yellow-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-gray-600 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
