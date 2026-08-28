"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FolderKanban,
  Award,
  Hash,
  Trash2,
  AlertTriangle,
  Building,
  Sparkles,
  ArrowRight,
  Users,
} from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/modal";
import type { Project } from "@/lib/types";

const DEFAULT_FORM = {
  name: "",
  organizationName: "",
  serialPrefix: "CERT",
  startingSerial: "1",
  description: "",
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!cancelled) {
          setProjects(data.projects || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          setLoading(false);
        }
      }
    })();

    if (session?.user?.role === "superadmin") {
      fetch("/api/admins")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.admins)) {
            setTeamCount(data.admins.length);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [session?.user?.role]);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoDataUrl }),
      });
      setSaving(false);
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Something went wrong.");
        return;
      }
      setModalOpen(false);
      setForm(DEFAULT_FORM);
      setLogoDataUrl(null);
      loadProjects();
    } catch {
      setSaving(false);
      setCreateError("Failed to connect to the server.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      loadProjects();
    } finally {
      setDeleting(false);
    }
  }

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.organizationName && p.organizationName.toLowerCase().includes(q)) ||
        (p.serialPrefix && p.serialPrefix.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  // Summary Metrics
  const totalCertificates = useMemo(
    () => projects.reduce((acc, p) => acc + (p.serialCounter || 0), 0),
    [projects]
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Certificate Projects
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Create, design, and manage participant certificate issuances.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus size={16} />
          <span>New Project</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-[#3B82F6]">
            <FolderKanban size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
              Total Projects
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              {loading ? "..." : projects.length}
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED] dark:bg-purple-950/50 dark:text-[#8B5CF6]">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
              Certificates Issued
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              {loading ? "..." : totalCertificates}
            </span>
          </div>
        </Card>

        {session?.user?.role === "superadmin" ? (
          <Link href="/admin/team" className="col-span-2 sm:col-span-1 block">
            <Card hover className="p-4 sm:p-5 flex items-center justify-between gap-3 h-full">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                    Team Members
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                    {teamCount !== null ? `${teamCount} in Team` : "..."}
                  </span>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </Card>
          </Link>
        ) : (
          <Card className="col-span-2 sm:col-span-1 p-4 sm:p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#10B981] dark:bg-emerald-950/50 dark:text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Status
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                System Active
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            placeholder="Search projects or organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>

        {searchQuery && (
          <p className="text-xs text-gray-500 self-center">
            Found {filteredProjects.length} of {projects.length} projects
          </p>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full py-16 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-medium text-gray-400">Loading your projects...</p>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 mb-3">
              <FolderKanban size={28} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              No projects created yet
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Get started by creating your first certificate project. You can design the layout, add participants, and issue certificates.
            </p>
            <Button onClick={() => setModalOpen(true)} className="mt-4 font-semibold">
              <Plus size={15} />
              <span>Create Project</span>
            </Button>
          </div>
        )}

        {!loading && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-gray-500">
            No projects matched &ldquo;{searchQuery}&rdquo;.
          </div>
        )}

        <AnimatePresence>
          {filteredProjects.map((p, i) => (
            <motion.div
              key={p._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
            >
              <Card hover className="group relative flex h-full flex-col justify-between p-5">
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {p.branding?.logoUrl ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-800/60">
                          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary data-URI logo */}
                          <img
                            src={p.branding.logoUrl}
                            alt=""
                            className="max-h-8 max-w-8 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-[#3B82F6]">
                          <FolderKanban size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/projects/${p._id}`}
                          className="block truncate font-semibold text-[#111827] transition hover:text-[#2563EB] dark:text-[#F8FAFC]"
                        >
                          {p.name}
                        </Link>
                        <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {p.organizationName || "No organization"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: p._id, name: p.name });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {p.description && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                    <Hash size={12} className="text-gray-400" />
                    <span>{p.serialPrefix}</span>
                    <span>·</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {p.serialCounter || 0} issued
                    </span>
                  </div>

                  <Link
                    href={`/admin/projects/${p._id}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>Manage</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-0.5 leading-relaxed">
                Deleting &ldquo;<span className="font-bold">{deleteTarget?.name}</span>&rdquo; will permanently delete all template designs, custom fields, and participant certificate records associated with it.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleting}
              disabled={deleting}
              className="text-xs font-semibold"
            >
              {deleting ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a New Certificate Project"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Project Name *
              </label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. AI Certification Bootcamp 2026"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Organization / Institution Name
              </label>
              <div className="relative">
                <Building size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="e.g. Acme Academy"
                  className="pl-8 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Serial Prefix
              </label>
              <Input
                value={form.serialPrefix}
                onChange={(e) => setForm({ ...form, serialPrefix: e.target.value.toUpperCase() })}
                placeholder="CERT"
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Starting Number
              </label>
              <Input
                type="number"
                min={1}
                value={form.startingSerial}
                onChange={(e) => setForm({ ...form, startingSerial: e.target.value })}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="sm:col-span-2 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/40 text-[11px] text-gray-500 dark:text-gray-400">
              Preview format: <strong className="font-mono text-primary">{form.serialPrefix || "CERT"}-{String(form.startingSerial || 1).padStart(5, "0")}</strong>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Organization Logo (Optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="input file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20 text-xs"
                />
                {logoDataUrl && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local file preview data URI */}
                    <img src={logoDataUrl} alt="Preview" className="max-h-8 max-w-8 object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short notes about this project cohort..."
                className="h-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          {createError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {createError}
            </p>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.name.trim()}
              loading={saving}
              className="text-xs font-semibold"
            >
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
