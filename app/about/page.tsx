import type { Metadata } from "next";
import Link from "next/link";
import { AboutHeader } from "@/components/about-header";
import { WhoWeAreSection } from "@/components/who-we-are-section";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Who We Are — Ahsan & Team | VeriMoo Platform",
  description:
    "Ahsan & My Team provide modern Agile technology solutions, digital trust, and certificate verification systems.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] dark:bg-black">
      {/* Responsive Header */}
      <AboutHeader />

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
