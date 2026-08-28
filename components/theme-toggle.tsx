"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme, type ThemePreference } from "@/app/theme-provider";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

// A segmented, sliding switch (light/dark/system) rather than a dropdown menu
// — the highlighted pill animates to whichever option is active.
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative inline-flex items-center rounded-full border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setPreference(value)}
            className={`relative z-10 flex items-center justify-center rounded-full p-1.5 transition-colors ${
              active ? "text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 -z-10 rounded-full bg-primary"
              />
            )}
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
