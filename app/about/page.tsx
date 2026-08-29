import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WhoWeAreSection } from "@/components/who-we-are-section";

export const metadata: Metadata = {
  title: "Who We Are — Ahsan & Team | VeriMoo Platform",
  description:
    "Ahsan & My Team provide modern Agile technology solutions, digital trust, and certificate verification systems.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md dark:border-[#27272a] dark:bg-black/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="relative h-9 w-9 flex items-center justify-center">
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

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition dark:text-[#94A3B8] dark:hover:text-white"
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

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <WhoWeAreSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white/70 py-6 text-center text-xs text-[#64748B] dark:border-[#27272a] dark:bg-black/80 dark:text-[#94A3B8]">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/verimoo.png"
              alt="VeriMoo"
              width={20}
              height={20}
              className="h-5 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} Ahsan & Team · VeriMoo Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
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
              href="https://github.com/allen9650/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2563EB] transition"
            >
              GitHub
            </a>
            <span>·</span>
            <Link href="/login" className="hover:text-[#2563EB] transition">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
