"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Award,
  Sparkles,
} from "lucide-react";
import { Button, Input, Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import Image from "next/image";
import type { VerifyResult } from "@/lib/types";

export default function HomePage() {
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [info, setInfo] = useState<VerifyResult | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = serial.trim();
    if (!query) return;
    setStatus("loading");
    setImageLoaded(false);
    setImageError(false);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setInfo(data);
        setStatus("found");
      } else {
        setInfo(null);
        setStatus("notfound");
      }
    } catch {
      setInfo(null);
      setStatus("notfound");
    }
  }

  function handleReset() {
    setSerial("");
    setStatus("idle");
    setInfo(null);
    setImageLoaded(false);
    setImageError(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] dark:bg-black">
      {/* Sticky Header with VeriMoo Transparent Logo */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md dark:border-[#27272a] dark:bg-black/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
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
          <div className="flex items-center gap-2 sm:gap-3">
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

      {/* Main Content with Modern Soft Gradient Hero Area */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-[#EEF2FF]/60 to-transparent dark:from-[#2563EB]/15 dark:via-[#7C3AED]/10 dark:to-transparent py-14 sm:py-20 text-center px-4">
          <div className="mx-auto max-w-2xl">
            {/* Hero Pill Badge */}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3.5 py-1 text-xs font-semibold text-[#4F46E5] shadow-xs backdrop-blur-xs dark:border-indigo-900/50 dark:bg-[#141418]/80 dark:text-indigo-300">
              <Sparkles size={13} className="text-[#7C3AED]" />
              <span>Digital Trust & Certificate Verification</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111827] dark:text-[#F8FAFC] leading-tight">
              Instant Certificate & Credential Verification
            </h1>
            <p className="mt-3.5 text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
              Search, verify authenticity, and download verified digital certificates issued securely with VeriMoo.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mt-8 mx-auto max-w-lg">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    type="text"
                    placeholder="e.g. CERT-00001 or serial number"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    className="pl-10 h-11 text-sm font-mono sm:text-base shadow-xs"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={status === "loading" || !serial.trim()}
                  loading={status === "loading"}
                  className="h-11 sm:w-28 text-sm sm:text-base font-semibold shadow-xs"
                >
                  Search
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Results Area */}
        <section className="mx-auto max-w-2xl px-4 pb-16">
          <AnimatePresence mode="wait">
            {status === "notfound" && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-left text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#EF4444]" />
                  <div>
                    <h3 className="font-semibold">No Certificate Found</h3>
                    <p className="mt-1 text-xs sm:text-sm text-red-700/90 dark:text-red-300/90">
                      No certificate was found for &ldquo;<span className="font-mono font-medium">{serial}</span>&rdquo;. Please check the serial number and try again.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {status === "found" && info && (
              <motion.div
                key="found"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-left"
              >
                <Card className="overflow-hidden border-indigo-200/80 shadow-lg dark:border-indigo-900/40">
                  {/* Verified Header Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-4 sm:p-5 dark:border-[#334155]">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#10B981] dark:bg-emerald-950/60 dark:text-emerald-400 shadow-xs">
                        <ShieldCheck size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#F8FAFC] break-words">
                            {info.name}
                          </h2>
                          <Badge color="green" dot>
                            Verified
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono truncate">
                          Serial: {info.serialNumber}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-[#64748B] hover:text-[#2563EB] transition dark:hover:text-white"
                    >
                      Search another
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                      {info.courseTitle && (
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#141418] min-w-0">
                          <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">Course / Program</span>
                          <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] mt-0.5 block break-words">{info.courseTitle}</span>
                        </div>
                      )}
                      {info.date && (
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#141418] min-w-0">
                          <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">Date Issued</span>
                          <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] mt-0.5 block truncate">{info.date}</span>
                        </div>
                      )}
                      {info.organizationName && (
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#141418] sm:col-span-2 min-w-0">
                          <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">Issuing Organization</span>
                          <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] mt-0.5 block break-words">{info.organizationName}</span>
                        </div>
                      )}
                    </div>

                    {/* SVG Certificate Preview Frame */}
                    <div className="relative min-h-[160px] w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100/70 p-2 sm:p-4 text-center dark:border-[#27272a] dark:bg-black">
                      {!imageLoaded && !imageError && (
                        <div className="flex h-48 items-center justify-center">
                          <ProgressBar label="Rendering high-resolution certificate..." />
                        </div>
                      )}
                      {imageError && (
                        <div className="p-8 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                          <Award className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p>Certificate preview unavailable. You can still download the certificate below.</p>
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic SVG Certificate */}
                      <img
                        src={`/api/certificate/${encodeURIComponent(info.serialNumber ?? "")}?format=svg`}
                        alt={`Certificate for ${info.name}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        className={`mx-auto max-h-[60vh] w-auto max-w-full rounded-lg shadow-sm object-contain transition-opacity duration-200 ${
                          imageLoaded ? "opacity-100" : "hidden"
                        }`}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <a
                          className="btn-primary text-xs sm:text-sm"
                          href={`/api/certificate/${encodeURIComponent(info.serialNumber ?? "")}?format=download`}
                        >
                          <Download size={15} />
                          <span>Download SVG</span>
                        </a>
                        <Link
                          className="btn-outline text-xs sm:text-sm"
                          href={`/verify/${encodeURIComponent(info.serialNumber ?? "")}`}
                        >
                          <ExternalLink size={15} />
                          <span>Verification Page</span>
                        </Link>
                      </div>

                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Print at <strong>100% (Actual Size)</strong>
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white/70 py-6 text-center text-xs text-[#64748B] dark:border-[#27272a] dark:bg-black/80 dark:text-[#94A3B8]">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/verimoo.png"
              alt="VeriMoo"
              width={20}
              height={20}
              className="h-5 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} VeriMoo. Secure Digital Certificate Verification.</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-changelog"))}
              className="hover:text-[#2563EB] transition cursor-pointer text-slate-500 hover:underline flex items-center gap-1"
            >
              <Sparkles size={12} className="text-[#7C3AED]" />
              <span>v1.2.4 Changelog</span>
            </button>
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
