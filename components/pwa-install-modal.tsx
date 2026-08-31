"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  MoreVertical,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallModal({
  open,
  onClose,
  deferredPrompt,
  onInstalled,
}: {
  open: boolean;
  onClose: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled?: () => void;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [installing, setInstalling] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleDirectInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        onInstalled?.();
        onClose();
      }
    } catch (err) {
      console.warn("Direct install error:", err);
    } finally {
      setInstalling(false);
    }
  }

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl dark:border-[#27272a] dark:bg-[#121216] max-h-[92vh] overflow-y-auto"
          >
            {/* Header with App Icon and Close Button */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[#27272a]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 p-2 shadow-xs dark:bg-blue-950/40">
                  <Image
                    src="/verimoo.png"
                    alt="VeriMoo App"
                    width={40}
                    height={40}
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Install VeriMoo App
                  </h3>
                  <p className="text-xs text-[#2563EB] dark:text-[#3B82F6] font-medium">
                    Android, Tablet &amp; Web App
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-[#1f1f26] dark:text-slate-400 dark:hover:bg-[#2a2a34] dark:hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="mt-4 rounded-xl bg-blue-50/90 p-3.5 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <div className="flex items-start gap-2.5">
                <Sparkles size={18} className="text-[#2563EB] dark:text-[#3B82F6] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                  Install VeriMoo on your Android phone or tablet for fast 1-tap access, offline verification, and smooth fullscreen management.
                </p>
              </div>
            </div>

            {/* Direct 1-Click Install Button (if browser prompt available) */}
            {deferredPrompt && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  disabled={installing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1D4ED8] active:scale-[0.99] transition cursor-pointer disabled:opacity-70"
                >
                  <Download size={18} />
                  <span>{installing ? "Installing..." : "Install Now (1-Tap)"}</span>
                </button>
              </div>
            )}

            {/* Step-by-Step Visual Guide for Android Chrome / Browsers */}
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Installation Steps on Android &amp; Chrome
              </p>

              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-[#27272a] dark:bg-[#18181f]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-[#2563EB] dark:bg-blue-950 dark:text-[#3B82F6]">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>Tap the browser menu</span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-xs font-mono text-slate-800 dark:bg-[#282834] dark:text-slate-200">
                        <MoreVertical size={13} /> 3 dots
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Located in the top-right corner of Google Chrome or Samsung Internet.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-[#27272a] dark:bg-[#18181f]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-[#2563EB] dark:bg-blue-950 dark:text-[#3B82F6]">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>Select</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/90 px-1.5 py-0.5 text-xs font-semibold text-[#2563EB] dark:bg-blue-950/60 dark:text-[#3B82F6]">
                        <Download size={13} /> Install app
                      </span>
                      <span className="text-xs text-slate-500 font-normal">or &quot;Add to Home screen&quot;</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Look for &quot;Install app&quot; or &quot;Add to Home screen&quot; in the dropdown options.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-[#27272a] dark:bg-[#18181f]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-[#2563EB] dark:bg-blue-950 dark:text-[#3B82F6]">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-500" />
                      <span>Confirm &quot;Install&quot;</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      The VeriMoo icon will appear directly on your phone/tablet home screen and app launcher.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-[#27272a]">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl bg-slate-100 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-200 dark:bg-[#202028] dark:text-slate-200 dark:hover:bg-[#2c2c38] transition cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default PwaInstallModal;
