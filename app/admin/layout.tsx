"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  FolderKanban,
  Users,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui";
import { PwaInstallButton } from "@/components/pwa-install-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Synchronize mobile menu state on navigation without cascading renders
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          <span>Loading VeriMoo Admin...</span>
        </div>
      </div>
    );
  }

  const isSuperadmin = session.user?.role === "superadmin";
  const isProjectsActive = pathname === "/admin" || pathname.startsWith("/admin/projects");
  const isTeamActive = pathname.startsWith("/admin/team");

  const displayName = session.user?.name || session.user?.email?.split("@")[0] || "Admin";
  const email = session.user?.email || "";
  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black">
      {/* Sticky Responsive Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md dark:border-[#27272a] dark:bg-black/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3.5 sm:px-6">
          {/* Brand & Desktop/Tablet Navigation */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-shrink">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-[#111827] transition hover:opacity-90 dark:text-[#F8FAFC] min-w-0 flex-shrink-0"
            >
              <div className="relative h-8 w-8 flex items-center justify-center">
                <Image
                  src="/verimoo.png"
                  alt="VeriMoo Logo"
                  width={32}
                  height={32}
                  priority
                  className="h-8 w-auto object-contain"
                />
              </div>
              <span>VeriMoo</span>
              <span className="hidden xs:inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB] dark:bg-[#18181c] dark:text-[#3B82F6]">
                Admin
              </span>
            </Link>

            {/* Desktop & Tablet Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                  isProjectsActive
                    ? "bg-blue-50 text-[#2563EB] font-semibold dark:bg-[#18181c] dark:text-[#3B82F6]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#18181c] dark:hover:text-slate-200"
                }`}
              >
                <FolderKanban size={15} className={isProjectsActive ? "text-[#2563EB] dark:text-[#3B82F6]" : "text-slate-400"} />
                <span>Projects</span>
              </Link>

              {isSuperadmin && (
                <Link
                  href="/admin/team"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                    isTeamActive
                      ? "bg-blue-50 text-[#2563EB] font-semibold dark:bg-[#18181c] dark:text-[#3B82F6]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#18181c] dark:hover:text-slate-200"
                  }`}
                >
                  <Users size={15} className={isTeamActive ? "text-[#2563EB] dark:text-[#3B82F6]" : "text-slate-400"} />
                  <span>Team</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Desktop & Tablet Right Controls */}
          <div className="hidden sm:flex items-center gap-3 lg:gap-4">
            {/* User Profile Pill */}
            <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-slate-50/80 py-1 pl-1.5 pr-2.5 dark:border-[#27272a] dark:bg-[#141418]">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-[10px] font-bold text-white shadow-xs"
                title={email}
              >
                {initials}
              </div>
              <div className="flex flex-col text-left">
                <span className="max-w-[120px] lg:max-w-[160px] truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {email}
                </span>
              </div>
              <Badge color={isSuperadmin ? "purple" : "blue"} className="!py-0 !px-1.5 text-[10px]">
                {isSuperadmin ? "Superadmin" : "Admin"}
              </Badge>
            </div>

            {/* Sign out button */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:text-[#EF4444] dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 cursor-pointer"
              title="Sign out of admin"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Sign out</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-[#27272a]" aria-hidden="true" />

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>

          {/* Mobile Right Controls: Theme Toggle & Hamburger Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-700 transition hover:bg-slate-100 dark:border-[#27272a] dark:bg-[#0e0e12] dark:text-slate-200 dark:hover:bg-[#18181c] cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[#E2E8F0] bg-white dark:border-[#27272a] dark:bg-black sm:hidden shadow-lg"
            >
              <div className="space-y-3 px-4 py-4">
                {/* Mobile User Card */}
                <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-slate-50/80 p-3 dark:border-[#27272a] dark:bg-[#141418]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-xs font-bold text-white shadow-xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {email}
                    </p>
                  </div>
                  <Badge color={isSuperadmin ? "purple" : "blue"}>
                    {isSuperadmin ? "Superadmin" : "Admin"}
                  </Badge>
                </div>

                {/* PWA Install Option */}
                <PwaInstallButton compact />

                {/* Mobile Navigation Links */}
                <div className="space-y-1">
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isProjectsActive
                        ? "bg-blue-50 text-[#2563EB] font-semibold dark:bg-[#18181c] dark:text-[#3B82F6]"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#18181c]"
                    }`}
                  >
                    <FolderKanban size={16} />
                    <span>Projects</span>
                  </Link>

                  {isSuperadmin && (
                    <Link
                      href="/admin/team"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isTeamActive
                          ? "bg-blue-50 text-[#2563EB] font-semibold dark:bg-[#18181c] dark:text-[#3B82F6]"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#18181c]"
                      }`}
                    >
                      <Users size={16} />
                      <span>Team Management</span>
                    </Link>
                  )}

                  <Link
                    href="/about"
                    target="_blank"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#18181c]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Sparkles size={16} className="text-[#7C3AED]" />
                      <span>Who We Are (Ahsan & Team)</span>
                    </span>
                    <span className="text-xs text-slate-400">↗</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#18181c]"
                  >
                    <span className="flex items-center gap-2.5">
                      <ExternalLink size={16} />
                      <span>Public Verification Page</span>
                    </span>
                    <span className="text-xs text-slate-400">↗</span>
                  </Link>
                </div>

                {/* Mobile Sign Out Button */}
                <div className="border-t border-[#E2E8F0] pt-3 dark:border-[#27272a]">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/50 py-2.5 text-sm font-medium text-[#EF4444] transition hover:bg-red-100/80 active:scale-[0.98] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Admin Footer */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#27272a] bg-white/40 dark:bg-black/40 py-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} <strong>Ahsan & Team</strong> · VeriMoo Platform
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <a
              href="https://www.linkedin.com/in/ahsan-raza8hbb/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2563EB] transition"
            >
              LinkedIn (Ahsan)
            </a>
            <span>·</span>
            <a
              href="https://github.com/allen9650/verimoo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2563EB] transition"
            >
              GitHub
            </a>
            <span>·</span>
            <Link href="/about" target="_blank" className="hover:text-[#2563EB] transition">
              Who We Are
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
