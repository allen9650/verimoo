"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { PwaInstallModal } from "@/components/pwa-install-modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton({
  className = "",
  compact = false,
  onClick,
}: {
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [showModal, setShowModal] = useState(false);

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

  function handleButtonClick() {
    onClick?.();
    setShowModal(true);
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
        onClick={handleButtonClick}
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

      {/* Portaled High-Readability Install Modal */}
      <PwaInstallModal
        open={showModal}
        onClose={() => setShowModal(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setIsInstalled(true)}
      />
    </>
  );
}

export default PwaInstallButton;
