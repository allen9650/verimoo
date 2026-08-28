"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Sparkles,
  X,
  Search,
  CheckCircle2,
  Rocket,
  Shield,
  Palette,
  Zap,
  Wrench,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { CHANGELOGS, CURRENT_VERSION, type ChangelogItem } from "@/lib/changelog-data";

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    "v1.2.4": true,
    "v1.2.3": true,
  });

  // Listen to custom event for opening changelog from footer/header links
  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener("open-changelog", handleOpenEvent);
    return () => window.removeEventListener("open-changelog", handleOpenEvent);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function toggleVersion(version: string) {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  }

  // Filter changelogs
  const filteredChangelogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return CHANGELOGS.map((release) => {
      const matchesSearch =
        !q ||
        release.version.toLowerCase().includes(q) ||
        release.title.toLowerCase().includes(q) ||
        release.summary.toLowerCase().includes(q) ||
        release.items.some((i) => i.text.toLowerCase().includes(q));

      const filteredItems = release.items.filter((item) => {
        if (activeFilter === "all") return true;
        if (activeFilter === "feature") return item.type === "feature";
        if (activeFilter === "ui") return item.type === "ui";
        if (activeFilter === "improvement") return item.type === "improvement";
        if (activeFilter === "fix") return item.type === "fix" || item.type === "security";
        return true;
      });

      return {
        ...release,
        matchesSearch,
        filteredItems,
      };
    }).filter((release) => release.matchesSearch && release.filteredItems.length > 0);
  }, [activeFilter, searchQuery]);

  function getItemIcon(type: ChangelogItem["type"]) {
    switch (type) {
      case "feature":
        return <Rocket size={13} className="text-[#2563EB]" />;
      case "ui":
        return <Palette size={13} className="text-[#7C3AED]" />;
      case "improvement":
        return <Zap size={13} className="text-[#4F46E5]" />;
      case "security":
        return <Shield size={13} className="text-[#10B981]" />;
      case "fix":
        return <Wrench size={13} className="text-[#F59E0B]" />;
      default:
        return <CheckCircle2 size={13} className="text-slate-400" />;
    }
  }

  function getItemBadge(type: ChangelogItem["type"]) {
    switch (type) {
      case "feature":
        return <Badge color="blue">Feature</Badge>;
      case "ui":
        return <Badge color="purple">UI/UX</Badge>;
      case "improvement":
        return <Badge color="indigo">Enhancement</Badge>;
      case "security":
        return <Badge color="green">Security</Badge>;
      case "fix":
        return <Badge color="yellow">Fix</Badge>;
      default:
        return <Badge color="gray">Update</Badge>;
    }
  }

  return (
    <>
      {/* Floating Changelog Trigger Button */}
      <aside aria-label="Version history" className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Open changelog, current version is ${CURRENT_VERSION}`}
          className="group relative flex items-center gap-2 rounded-full border border-indigo-200/90 bg-white/95 py-2 pl-3 pr-3.5 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-indigo-400 hover:shadow-xl dark:border-indigo-900/60 dark:bg-[#111827]/95 dark:hover:border-indigo-600 cursor-pointer"
        >
          {/* Subtle animated gradient dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C3AED] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" />
          </span>

          <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#4F46E5] dark:text-indigo-400 transition group-hover:rotate-12" />
            <span>{CURRENT_VERSION}</span>
          </span>

          <span className="hidden sm:inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB] dark:bg-[#1E293B] dark:text-[#3B82F6]">
            Changelog
          </span>
        </motion.button>
      </aside>

      {/* Interactive Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Dialog Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="changelog-modal-title"
              className="relative w-full max-w-2xl max-w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden dark:border-[#27272a] dark:bg-[#0e0e12] z-10 overscroll-contain"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 px-5 py-4 dark:border-[#27272a]">
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-white p-1.5 shadow-xs border border-indigo-100 dark:bg-[#18181c] dark:border-indigo-900/40">
                    <Image
                      src="/verimoo.png"
                      alt="VeriMoo"
                      width={28}
                      height={28}
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="changelog-modal-title" className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#F8FAFC]">
                        VeriMoo Release Changelogs
                      </h2>
                      <span className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        {CURRENT_VERSION}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Complete version history and feature roadmap tracking.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-[#18181c] dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close changelog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="border-b border-[#E2E8F0] bg-slate-50/70 px-5 py-3 dark:border-[#27272a] dark:bg-black/60 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    {[
                      { id: "all", label: "All Updates" },
                      { id: "feature", label: "Features" },
                      { id: "ui", label: "UI / UX" },
                      { id: "improvement", label: "Improvements" },
                      { id: "fix", label: "Fixes & Security" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveFilter(tab.id)}
                        className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap cursor-pointer ${
                          activeFilter === tab.id
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-[#18181c] dark:text-slate-300 dark:hover:bg-[#23232a]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[160px] sm:w-48">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search release..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white py-1 pl-8 pr-2.5 text-xs text-[#111827] focus:border-[#2563EB] focus:outline-none dark:border-[#27272a] dark:bg-black dark:text-[#F8FAFC]"
                    />
                  </div>
                </div>
              </div>

              {/* Changelog Timeline List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {filteredChangelogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No release notes matched your filter or search query.
                  </div>
                ) : (
                  filteredChangelogs.map((release) => {
                    const isExpanded = expandedVersions[release.version] ?? true;
                    return (
                      <div
                        key={release.version}
                        className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 last:border-transparent pb-4 last:pb-0"
                      >
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#0e0e12] border-2 border-[#2563EB]">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                        </div>

                        {/* Release Header */}
                        <div
                          onClick={() => toggleVersion(release.version)}
                          className="flex items-start justify-between gap-3 cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-extrabold text-[#2563EB] dark:text-[#3B82F6]">
                                {release.version}
                              </span>
                              {release.isLatest && (
                                <Badge color="green" dot>
                                  Current Version
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                <Calendar size={11} />
                                <span>{release.date}</span>
                              </div>
                            </div>

                            <h3 className="mt-1 text-sm sm:text-base font-bold text-[#111827] group-hover:text-[#2563EB] transition dark:text-[#F8FAFC]">
                              {release.title}
                            </h3>

                            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                              {release.summary}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="p-1 text-slate-400 group-hover:text-slate-600 transition"
                            aria-label={isExpanded ? "Collapse version" : "Expand version"}
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>

                        {/* Items List */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <ul className="mt-3 space-y-2 rounded-xl bg-slate-50/80 p-3.5 text-xs dark:bg-[#18181c] border border-slate-100 dark:border-[#27272a]">
                                {release.filteredItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2.5">
                                    <span className="mt-0.5 shrink-0 flex items-center justify-center">
                                      {getItemIcon(item.type)}
                                    </span>
                                    <span className="shrink-0">{getItemBadge(item.type)}</span>
                                    <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {item.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[#E2E8F0] bg-slate-50/80 px-5 py-3 text-center text-xs text-[#64748B] dark:border-[#27272a] dark:bg-black/80 dark:text-[#94A3B8]">
                <span>VeriMoo Digital Certificate Platform · Version {CURRENT_VERSION}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

