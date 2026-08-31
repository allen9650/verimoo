"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { Modal } from "@/components/modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("VeriMoo PWA Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration notice:", err);
        });
    }

    // 2. Listen for browser install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("Install prompt invocation error:", err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  }

  if (isInstalled && !compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Check size={13} />
        <span>App Installed</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install VeriMoo Progressive Web App on Android, Tablet, or PC"
        className={
          className ||
          (compact
            ? "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition cursor-pointer"
            : "inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-[#2563EB] hover:bg-blue-100 hover:border-blue-300 transition dark:border-blue-900/50 dark:bg-[#18181c] dark:text-[#3B82F6] dark:hover:bg-[#23232a] cursor-pointer shadow-xs")
        }
      >
        <div className="flex items-center gap-1.5">
          <Smartphone size={15} className="text-[#2563EB] dark:text-[#3B82F6]" />
          <span>{compact ? "Install Android / Tablet App" : "Install App"}</span>
        </div>
        {compact && <Download size={15} className="text-blue-500" />}
      </button>

      {/* Guide Modal for Manual Installation */}
      <Modal open={showGuideModal} onClose={() => setShowGuideModal(false)} title="Install VeriMoo App">
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3 rounded-xl bg-blue-50/80 p-3.5 border border-blue-200/80 dark:bg-blue-950/20 dark:border-blue-900/40">
            <Smartphone size={22} className="shrink-0 text-[#2563EB] mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Install on Android Phones &amp; Tablets
              </p>
              <p className="mt-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                VeriMoo runs natively as an Android Progressive Web App with offline verification, quick certificate downloads, and full management tools.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="font-medium text-slate-900 dark:text-white">How to install in Chrome / Android Browser:</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs sm:text-sm">
              <li>
                Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of your browser.
              </li>
              <li>
                Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
              </li>
              <li>
                Confirm by tapping <strong>&quot;Install&quot;</strong>. VeriMoo will appear directly on your home screen and app drawer!
              </li>
            </ol>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="btn-primary text-xs sm:text-sm px-4 py-2"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PwaInstallButton;
