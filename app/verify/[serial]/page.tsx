"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  FileText,
  Search,
  Calendar,
  Hash,
  Building2,
  BookOpen,
  UserCheck,
  ArrowLeft,
  Eye,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProgressBar } from "@/components/progress-bar";
import { VERIFICATION_THEMES } from "@/lib/verificationThemes";
import { downloadCertificate } from "@/lib/clientCertificateDownload";
import type { VerifyResult } from "@/lib/types";

const DEFAULT_THEME = {
  label: "Certificate",
  headline: "is a verified holder of this certificate",
  icon: "🎓",
  accent: "#2563EB",
  gradient: ["#2563EB", "#7C3AED"],
};

export default function VerifyPage() {
  const { serial } = useParams<{ serial: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!serial) return;
    async function loadData() {
      try {
        let res = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
        if (!res.ok) {
          res = await fetch(`/api/verify?serial=${encodeURIComponent(serial)}`);
        }
        const data = await res.json();
        setResult(data);

        if (data && data.valid) {
          const target = data.serialNumber || serial;
          fetch(`/api/certificate/${encodeURIComponent(target)}?format=svg`)
            .then(async (r) => {
              if (r.ok) return r.text();
              const fallback = await fetch(`/api/certificate?serial=${encodeURIComponent(target)}&format=svg`);
              return fallback.ok ? fallback.text() : "";
            })
            .then((svg) => {
              if (svg && svg.includes("<svg")) {
                setSvgMarkup(svg);
                setImageLoaded(true);
              }
            })
            .catch(() => {});
        }
      } catch {
        setResult({ valid: false, message: "Network error occurred." });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [serial]);

  async function handleDownload(format: "png" | "pdf" = "png") {
    const targetSerial = (result?.serialNumber || serial || "").trim();
    if (!targetSerial) return;
    setDownloading(true);

    try {
      await downloadCertificate(targetSerial, format, svgMarkup);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
    }
  }

  const theme =
    (result?.verificationTemplate &&
      VERIFICATION_THEMES[result.verificationTemplate as keyof typeof VERIFICATION_THEMES]) ||
    DEFAULT_THEME;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-black">
      {/* Verification Header */}
      <header className="w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md dark:border-[#27272a] dark:bg-black/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition dark:text-[#94A3B8] dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>Search Certificates</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
              <Image
                src="/verimoo.png"
                alt="VeriMoo"
                width={22}
                height={22}
                className="h-5 w-auto object-contain"
              />
              <span>VeriMoo</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Verification Body */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl dark:border-[#27272a] dark:bg-[#0e0e12]"
        >
          {loading && (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20 flex items-center justify-center">
                <ShieldCheck size={24} className="text-primary animate-spin" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Verifying digital certificate authenticity...
              </p>
            </div>
          )}

          {!loading && result?.valid && (
            <>
              {/* Dynamic Theme Banner */}
              <div
                className="relative px-6 py-8 text-center text-white overflow-hidden shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                }}
              >
                {result.logoUrl && (
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 p-2 backdrop-blur-md shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Logo alpha rendering */}
                    <img
                      src={result.logoUrl}
                      alt={`${result.organizationName || "Organization"} logo`}
                      className="max-h-12 max-w-12 object-contain"
                    />
                  </div>
                )}
                <span className="text-3xl filter drop-shadow-sm">{theme.icon}</span>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/90">
                  {theme.label} · Verified Credential
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight filter drop-shadow-xs break-words">
                  {result.name}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-white/90 max-w-sm mx-auto leading-relaxed break-words">
                  {result.name} {theme.headline}
                  {result.courseTitle ? ` — ${result.courseTitle}` : ""}
                </p>
              </div>

              {/* Verified Details */}
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-center gap-2">
                  <Badge color="green" dot className="px-3 py-1 text-xs sm:text-sm font-semibold">
                    <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Officially Verified & Authentic</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  {result.date && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={13} />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Date Issued</span>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block truncate">
                        {result.date}
                      </span>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40 min-w-0">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Hash size={13} />
                      <span className="text-[11px] font-medium uppercase tracking-wider">Serial Number</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 block truncate">
                      {result.serialNumber}
                    </span>
                  </div>

                  {result.organizationName && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40 sm:col-span-2 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 size={13} />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Issuing Organization</span>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block break-words">
                        {result.organizationName}
                      </span>
                    </div>
                  )}

                  {result.projectName && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40 sm:col-span-2 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <BookOpen size={13} />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Program / Course</span>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block break-words">
                        {result.projectName}
                      </span>
                    </div>
                  )}

                  {result.creator && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800/80 dark:bg-gray-800/40 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <UserCheck size={13} />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Credential Manager</span>
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-300 mt-1 block">
                        {result.creator.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* SVG Certificate Preview Option */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowPreview((prev) => !prev)}
                      className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1.5 dark:text-[#3B82F6] cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>{showPreview ? "Hide Certificate Preview" : "Show Certificate Preview"}</span>
                    </button>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">High-Definition Preview</span>
                  </div>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100/70 p-2 text-center dark:border-[#27272a] dark:bg-black flex items-center justify-center min-h-[160px]"
                      >
                        {!imageLoaded && !imageError && !svgMarkup && (
                          <div className="flex h-44 items-center justify-center">
                            <ProgressBar label="Loading certificate vector preview..." />
                          </div>
                        )}
                        {imageError && !svgMarkup && (
                          <div className="p-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                            <Award className="mx-auto h-6 w-6 text-slate-400 mb-1" />
                            <p>Certificate rendered securely. You can download the official file below.</p>
                          </div>
                        )}

                        {svgMarkup ? (
                          <div
                            className="w-full flex items-center justify-center overflow-auto max-h-[50vh] rounded-lg shadow-xs [&>svg]:max-h-[50vh] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:h-auto"
                            dangerouslySetInnerHTML={{ __html: svgMarkup }}
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element -- Dynamic SVG Certificate */
                          <img
                            src={`/api/certificate/${encodeURIComponent(result.serialNumber ?? "")}?format=svg`}
                            alt={`Certificate for ${result.name}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            className={`mx-auto max-h-[50vh] w-auto max-w-full rounded-lg shadow-xs object-contain transition-opacity duration-200 ${
                              imageLoaded && !imageError ? "opacity-100 block" : "hidden"
                            }`}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDownload("png")}
                    disabled={downloading}
                    className="btn-primary flex-1 text-xs sm:text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download size={15} />
                    <span>{downloading ? "Processing..." : "Download PNG"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload("pdf")}
                    disabled={downloading}
                    className="btn-outline flex-1 text-xs sm:text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileText size={15} className="text-[#2563EB] dark:text-[#3B82F6]" />
                    <span>{downloading ? "Processing..." : "Download PDF"}</span>
                  </button>
                  <Link
                    href="/"
                    className="btn-outline text-xs sm:text-sm inline-flex items-center justify-center gap-2"
                  >
                    <Search size={15} />
                    <span>Search Another</span>
                  </Link>
                </div>
              </div>

              {/* Organization Footer info */}
              {result.footer && (result.footer.companyName || result.footer.contactEmail) && (
                <div className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-400 dark:border-gray-800">
                  {result.footer.companyName && <p className="font-medium">{result.footer.companyName}</p>}
                  {result.footer.contactEmail && (
                    <p className="mt-0.5">
                      Contact: <a href={`mailto:${result.footer.contactEmail}`} className="underline hover:text-primary">{result.footer.contactEmail}</a>
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {!loading && !result?.valid && (
            <div className="p-8 sm:p-10 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <ShieldAlert size={28} />
              </div>
              <div>
                <Badge color="red" dot className="px-3 py-1 font-semibold">
                  Not Verified
                </Badge>
                <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                  Certificate Record Not Found
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  {result?.message || "This certificate serial number could not be verified against the official registry."}
                </p>
              </div>
              <Link href="/" className="btn-primary inline-flex text-xs sm:text-sm">
                <Search size={14} />
                <span>Search by Serial Number</span>
              </Link>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        <p>Verified with VeriMoo Security Engine</p>
      </footer>
    </div>
  );
}
