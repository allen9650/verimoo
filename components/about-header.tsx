"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { LinkedinIcon, GithubIcon } from "@/components/who-we-are-section";

export function AboutHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md dark:border-[#27272a] dark:bg-black/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition hover:opacity-90 min-w-0 flex-shrink-0"
        >
          <div className="relative h-9 w-9 flex items-center justify-center flex-shrink-0">
            <Image
              src="/verimoo.png"
              alt="VeriMoo Logo"
              width={36}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            VeriMoo
          </span>
        </Link>

        {/* Desktop Navigation (>= 640px) */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#2563EB] hover:bg-slate-100 transition dark:text-[#94A3B8] dark:hover:bg-[#18181c] dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>Verification Portal</span>
          </Link>

          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] transition dark:text-slate-300 dark:hover:bg-[#18181c] dark:hover:text-white"
          >
            Admin Login
          </Link>

          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-[#27272a] pl-2.5">
            <a
              href="https://www.linkedin.com/in/ahsan-raza8hbb/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-[#2563EB] transition dark:text-slate-400 dark:hover:text-white"
              title="LinkedIn (Ahsan)"
            >
              <LinkedinIcon size={16} />
            </a>
            <a
              href="https://github.com/allen9650/verimoo"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-[#2563EB] transition dark:text-slate-400 dark:hover:text-white"
              title="GitHub Repository"
            >
              <GithubIcon size={16} />
            </a>
          </div>

          <ThemeToggle />
        </div>

        {/* Mobile Right Controls (< 640px) */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-700 transition hover:bg-slate-100 dark:border-[#27272a] dark:bg-[#0e0e12] dark:text-slate-200 dark:hover:bg-[#18181c] cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#E2E8F0] bg-white/95 backdrop-blur-md dark:border-[#27272a] dark:bg-black/95 sm:hidden shadow-lg"
          >
            <div className="space-y-2 px-4 py-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] dark:text-slate-300 dark:hover:bg-[#18181c] dark:hover:text-white transition"
              >
                <ArrowLeft size={15} />
                <span>Verification Portal</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] dark:text-slate-300 dark:hover:bg-[#18181c] dark:hover:text-white transition"
              >
                <span>Admin Login</span>
              </Link>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#27272a] pt-2.5 px-3">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Connect with team</span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.linkedin.com/in/ahsan-raza8hbb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-[#2563EB] transition dark:text-slate-400 dark:hover:text-white"
                    title="LinkedIn (Ahsan)"
                  >
                    <LinkedinIcon size={16} />
                  </a>
                  <a
                    href="https://github.com/allen9650/verimoo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-[#2563EB] transition dark:text-slate-400 dark:hover:text-white"
                    title="GitHub Repository"
                  >
                    <GithubIcon size={16} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

