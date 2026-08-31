"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { openPwaInstallModal } from "@/components/global-pwa-modal";

export function PwaInstallButton({
  className = "",
  compact = false,
  onClick,
}: {
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://");
    const stored = localStorage.getItem("verimoo_pwa_installed") === "true";
    return isStandalone || stored;
  });

  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem("verimoo_pwa_installed", "true");
      } catch {}
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function handleButtonClick() {
    onClick?.();
    openPwaInstallModal();
  }

  // Auto-hide completely when running in installed/standalone PWA mode on Android/Tablets
  if (isInstalled) {
    return null;
  }

  return (
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
  );
}

export default PwaInstallButton;
