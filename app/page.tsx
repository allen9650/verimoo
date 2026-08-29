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
  RefreshCw,
} from "lucide-react";
import { Button, Input, Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { WhoWeAreSection, LinkedinIcon, GithubIcon } from "@/components/who-we-are-section";
import { downloadCertificateHD } from "@/lib/clientCertificateDownload";
import Link from "next/link";
import Image from "next/image";
import type { VerifyResult } from "@/lib/types";

export default function HomePage() {
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [info, setInfo] = useState<VerifyResult | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = serial.trim();
    if (!query) return;
    setStatus("loading");
    setImageLoaded(false);
    setImageError(false);
    setSvgMarkup("");

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setInfo(data);
        setStatus("found");

        // Fetch SVG markup for reliable direct rendering and 300 DPI canvas conversion
        fetch(`/api/certificate/${encodeURIComponent(data.serialNumber || query)}?format=svg`)
          .then((r) => (r.ok ? r.text() : ""))
          .then((svg) => {
            if (svg && svg.includes("<svg")) {
              setSvgMarkup(svg);
              setImageLoaded(true);
            }
          })
          .catch((err) => console.warn("SVG markup fetch warning:", err));
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
    setSvgMarkup("");
    setImageLoaded(false);
    setImageError(false);
  }

  async function handleDownload(format: "png" | "svg" = "png") {
    const targetSerial = (info?.serialNumber || serial).trim();
    if (!targetSerial) return;
    setDownloading(true);
    try {
      await downloadCertificateHD(targetSerial, svgMarkup, format);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] dark:bg-black">
      {/* Sticky Header with VeriMoo Transparent Logo */}
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

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#about"
              className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] transition dark:text-slate-300 dark:hover:bg-[#18181c] dark:hover:text-white"
            >
              Who We Are
            </a>

            <Link
              href="/login"
              className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] transition dark:text-slate-300 dark:hover:bg-[#18181c] dark:hover:text-white"
            >
              Admin Login
            </Link>

            <div className="hidden xs:flex items-center gap-1.5 border-l border-slate-200 dark:border-[#27272a] pl-2.5">
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
        </div>
      </header>

      {/* Main Hero & Search Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-12 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-[#2563EB] dark:border-[#27272a] dark:bg-[#0e0e12] dark:text-[#3B82F6] shadow-xs"
            >
              <ShieldCheck size={14} />
              <span>Digital Certificate Verification System</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl text-[#111827] dark:text-[#F8FAFC]"
            >
              Verify Any Certificate Instantly
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto"
            >
              Enter the unique certificate serial number below to verify authenticity and download official high-resolution credentials.
            </motion.p>

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mx-auto mt-8 max-w-xl"
            >
              <Card className="p-2 sm:p-2.5 shadow-xl border-[#E2E8F0] dark:border-[#27272a] bg-white/95 dark:bg-[#0e0e12]">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      type="text"
                      placeholder="e.g. CERT-00001 or 4324-ABCD-1234"
                      value={serial}
                      onChange={(e) => setSerial(e.target.value)}
                      className="w-full pl-10 text-sm font-mono"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={status === "loading" || !serial.trim()}
                    className="sm:w-auto w-full text-sm font-semibold shadow-xs"
                  >
                    {status === "loading" ? "Verifying..." : "Verify Certificate"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>

          {/* Search Results Area */}
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto mt-8 max-w-xl px-4"
              >
                <Card className="p-8 text-center space-y-3">
                  <ProgressBar label="Looking up certificate in secure registry..." />
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Validating cryptographic signatures &amp; issuer credentials...
                  </p>
                </Card>
              </motion.div>
            )}

            {status === "notfound" && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto mt-8 max-w-xl px-4"
              >
                <Card className="p-6 text-center space-y-3 border-red-200 bg-red-50/40 dark:border-red-950/60 dark:bg-red-950/20">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-base font-bold text-red-900 dark:text-red-200">
                    Certificate Not Found
                  </h3>
                  <p className="text-xs sm:text-sm text-red-700/90 dark:text-red-300/90 max-w-md mx-auto">
                    No certificate matching serial number <strong>&quot;{serial}&quot;</strong> could be verified. Please double-check the code and try again.
                  </p>
                </Card>
              </motion.div>
            )}

            {status === "found" && info && (
              <motion.div
                key="found"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mx-auto mt-8 max-w-3xl px-4"
              >
                <Card className="overflow-hidden border-indigo-200/90 shadow-2xl dark:border-[#27272a] dark:bg-[#0e0e12]">
                  {/* Verified Header Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-slate-50/80 px-4 py-3 sm:px-6 dark:border-[#27272a] dark:bg-[#141418]">
                    <div className="flex items-center gap-2">
                      <Badge color="green" dot className="font-semibold">
                        Verified &amp; Authentic
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6]">
                        {info.serialNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-[#64748B] hover:text-[#2563EB] transition dark:hover:text-white cursor-pointer"
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
                    <div className="relative min-h-[180px] w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100/70 p-2 sm:p-4 text-center dark:border-[#27272a] dark:bg-black flex items-center justify-center">
                      {!imageLoaded && !imageError && !svgMarkup && (
                        <div className="flex h-56 items-center justify-center">
                          <ProgressBar label="Rendering high-resolution vector certificate..." />
                        </div>
                      )}

                      {imageError && !svgMarkup && (
                        <div className="p-8 text-center text-sm text-[#64748B] dark:text-[#94A3B8] space-y-3">
                          <Award className="mx-auto h-8 w-8 text-slate-400" />
                          <p>Certificate rendered securely. You can view or download the official file below.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setImageError(false);
                              setImageLoaded(false);
                              if (info.serialNumber) {
                                fetch(`/api/certificate/${encodeURIComponent(info.serialNumber)}?format=svg`)
                                  .then((r) => r.text())
                                  .then((s) => {
                                    if (s && s.includes("<svg")) setSvgMarkup(s);
                                  });
                              }
                            }}
                            className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                          >
                            <RefreshCw size={13} />
                            <span>Retry Preview</span>
                          </button>
                        </div>
                      )}

                      {/* Direct Inline Vector Rendering (Fastest & Most Reliable in Production) */}
                      {svgMarkup ? (
                        <div
                          className="w-full flex items-center justify-center overflow-auto max-h-[65vh] rounded-lg shadow-sm [&>svg]:max-h-[65vh] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:h-auto"
                          dangerouslySetInnerHTML={{ __html: svgMarkup }}
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element -- Dynamic SVG Certificate Fallback */
                        <img
                          key={`${info.serialNumber}-${imageError ? "retry" : "main"}`}
                          src={`/api/certificate/${encodeURIComponent(info.serialNumber ?? "")}?format=svg`}
                          alt={`Certificate for ${info.name}`}
                          onLoad={() => setImageLoaded(true)}
                          onError={() => setImageError(true)}
                          className={`mx-auto max-h-[65vh] w-auto max-w-full rounded-lg shadow-sm object-contain transition-opacity duration-200 ${
                            imageLoaded && !imageError ? "opacity-100 block" : "hidden"
                          }`}
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownload("png")}
                          disabled={downloading}
                          className="btn-primary text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2 shadow-xs"
                        >
                          <Download size={15} />
                          <span>{downloading ? "Generating HD PNG..." : "Download HD PNG"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload("svg")}
                          disabled={downloading}
                          className="btn-outline text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2 shadow-xs"
                        >
                          <Download size={14} className="text-[#2563EB] dark:text-[#3B82F6]" />
                          <span>Download SVG</span>
                        </button>
                        <Link
                          className="btn-outline text-xs sm:text-sm"
                          href={`/verify/${encodeURIComponent(info.serialNumber ?? "")}`}
                        >
                          <ExternalLink size={15} />
                          <span>Verification Page</span>
                        </Link>
                      </div>

                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Ultra HD <strong>300 DPI PNG</strong>
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Who We Are & Ahsan & Team Showcase */}
        <WhoWeAreSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white/70 py-8 text-xs text-[#64748B] dark:border-[#27272a] dark:bg-black/80 dark:text-[#94A3B8]">
        <div className="mx-auto flex max-w-6xl flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/verimoo.png"
              alt="VeriMoo"
              width={22}
              height={22}
              className="h-5 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} <strong>Ahsan & Team</strong> · VeriMoo Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-medium">
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
            <Link href="/about" className="hover:text-[#2563EB] transition">
              About &amp; Services
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:text-[#2563EB] transition">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
