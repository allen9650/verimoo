"use client";

import { motion, AnimatePresence } from "framer-motion";

// An indeterminate progress bar with a status message using the VeriMoo brand gradient
export function ProgressBar({ label }: { label: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            />
          </div>
          <span>{label}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
