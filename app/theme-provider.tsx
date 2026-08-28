"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "cert-system-theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Reads state straight from the DOM/localStorage (the source of truth, set
// synchronously by the inline `themeInitScript` before hydration) rather than
// mirroring it into a useEffect + setState, which the react-hooks
// "set-state-in-effect" rule flags. useSyncExternalStore is the React-native
// way to read external mutable state like this.
function getPreferenceSnapshot(): ThemePreference {
  return (window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null) || "system";
}
function getServerPreferenceSnapshot(): ThemePreference {
  return "system";
}
function getResolvedSnapshot(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
function getServerResolvedSnapshot(): ResolvedTheme {
  return "light";
}

function applyResolvedTheme(preference: ThemePreference) {
  const isDark = preference === "dark" || (preference === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

// Module-level (not component-level) subscription: if the OS-level color
// scheme changes while the user has "system" selected, re-resolve and notify
// every ThemeProvider instance. This runs once per page load in the browser.
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getPreferenceSnapshot() === "system") {
      applyResolvedTheme("system");
      listeners.forEach((l) => l());
    }
  });
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}>({
  preference: "system",
  resolvedTheme: "light",
  setPreference: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getPreferenceSnapshot, getServerPreferenceSnapshot);
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedSnapshot, getServerResolvedSnapshot);

  function setPreference(next: ThemePreference) {
    window.localStorage.setItem(STORAGE_KEY, next);
    applyResolvedTheme(next);
    listeners.forEach((l) => l());
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>
  );
}

// Inline script string injected in <head> to set the class before hydration,
// so there's no flash of the wrong theme on reload, including for "system".
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
