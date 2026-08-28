"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  AlertTriangle,
  Mail,
  Lock,
  User,
  CheckCircle2,
  XCircle,
  Crown,
  ShieldCheck,
  ArrowUpDown,
} from "lucide-react";
import { Button, Input, Card, Badge } from "@/components/ui";
import { Modal } from "@/components/modal";
import type { AdminUser } from "@/lib/types";

const DEFAULT_FORM = {
  role: "admin" as "admin" | "superadmin",
  name: "",
  email: "",
  password: "",
  maxProjects: "",
  canDeleteProjects: true,
  canManageParticipants: true,
  canManageTemplates: true,
};

export default function TeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit / Role Change Modal
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "superadmin">("admin");
  const [editMaxProjects, setEditMaxProjects] = useState("");
  const [editPermissions, setEditPermissions] = useState({
    canDeleteProjects: true,
    canManageParticipants: true,
    canManageTemplates: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admins");
        const data = await res.json();
        if (!cancelled) {
          setAdmins(data.admins || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAdmins([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          name: form.name,
          email: form.email,
          password: form.password,
          maxProjects: form.role === "superadmin" ? null : form.maxProjects,
          permissions: form.role === "superadmin"
            ? { canDeleteProjects: true, canManageParticipants: true, canManageTemplates: true }
            : {
                canDeleteProjects: form.canDeleteProjects,
                canManageParticipants: form.canManageParticipants,
                canManageTemplates: form.canManageTemplates,
              },
        }),
      });
      setSaving(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }
      setModalOpen(false);
      setForm(DEFAULT_FORM);
      reload();
    } catch {
      setSaving(false);
      setError("Failed to create team member.");
    }
  }

  function openEditModal(admin: AdminUser) {
    setEditAdmin(admin);
    setEditRole(admin.role);
    setEditMaxProjects(admin.maxProjects !== null && admin.maxProjects !== undefined ? String(admin.maxProjects) : "");
    setEditPermissions({
      canDeleteProjects: admin.permissions?.canDeleteProjects ?? true,
      canManageParticipants: admin.permissions?.canManageParticipants ?? true,
      canManageTemplates: admin.permissions?.canManageTemplates ?? true,
    });
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAdmin) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admins/${editAdmin._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          maxProjects: editRole === "superadmin" ? null : editMaxProjects,
          permissions: editRole === "superadmin"
            ? { canDeleteProjects: true, canManageParticipants: true, canManageTemplates: true }
            : editPermissions,
        }),
      });
      setEditSaving(false);
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update member.");
        return;
      }
      setEditAdmin(null);
      reload();
    } catch {
      setEditSaving(false);
      setEditError("Failed to update team member.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admins/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Team Management
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Manage user roles between Super Admins (unlimited all-project access) and Simple Users (scoped limits).
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="self-start sm:self-auto font-semibold">
          <UserPlus size={16} />
          <span>Add Team Member</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED] dark:bg-purple-950/50 dark:text-[#8B5CF6]">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
              Total Team Members
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              {loading ? "..." : `${admins.length} in Team`}
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-[#3B82F6]">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
              Simple Users (Admins)
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              {loading ? "..." : admins.filter((a) => a.role !== "superadmin").length}
            </span>
          </div>
        </Card>

        <Card className="col-span-2 sm:col-span-1 p-4 sm:p-5 flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/50 dark:text-indigo-400">
            <Crown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
              Super Admins
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              {loading ? "..." : admins.filter((a) => a.role === "superadmin").length}
            </span>
          </div>
        </Card>
      </div>

      {/* Team Members List */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">Loading team members...</p>
        </div>
      )}

      {!loading && admins.length === 0 && (
        <Card className="py-12 text-center">
          <Users size={32} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">No team members added yet</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto">
            Add Super Admins or Simple Users to collaborate on certificate cohorts.
          </p>
          <Button onClick={() => setModalOpen(true)} className="mt-4 text-xs font-semibold">
            <UserPlus size={14} />
            <span>Add First Member</span>
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {admins.map((a) => {
          const initials = (a.name || a.email || "U")
            .split(/[\s._-]+/)
            .filter(Boolean)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U";

          const isSuper = a.role === "superadmin";

          return (
            <Card key={a._id} hover className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 min-w-0">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${
                    isSuper ? "bg-gradient-to-r from-[#7C3AED] to-[#4F46E5]" : "bg-[#2563EB]"
                  }`}
                >
                  {isSuper ? <Crown size={18} /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F8FAFC] truncate">
                      {a.name}
                    </h3>
                    <Badge color={isSuper ? "purple" : "blue"} dot={isSuper}>
                      {isSuper ? "Super Admin" : "Simple User"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5">
                    {a.email}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span className="font-medium text-[#111827] dark:text-[#F8FAFC]">
                      {a.projectCount ?? 0} project{a.projectCount === 1 ? "" : "s"} created
                    </span>
                    <span>·</span>
                    {isSuper ? (
                      <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                        <ShieldCheck size={13} />
                        <span>Sees All Projects & Full System Access</span>
                      </span>
                    ) : (
                      <>
                        <span className="font-medium">
                          Limit: {a.maxProjects !== null && a.maxProjects !== undefined ? `${a.maxProjects} projects` : "Unlimited"}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {a.permissions?.canDeleteProjects ? (
                            <CheckCircle2 size={12} className="text-[#10B981]" />
                          ) : (
                            <XCircle size={12} className="text-slate-400" />
                          )}
                          Delete Projects
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {a.permissions?.canManageParticipants !== false ? (
                            <CheckCircle2 size={12} className="text-[#10B981]" />
                          ) : (
                            <XCircle size={12} className="text-slate-400" />
                          )}
                          Participants
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0] dark:border-[#334155] w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={() => openEditModal(a)}
                  className="!py-1.5 !px-3 text-xs"
                >
                  <ArrowUpDown size={13} />
                  <span>Configure Role</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: a._id, email: a.email, name: a.name })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-[#EF4444] dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  title="Remove team member"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Team Member Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Team Member"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* STEP 1: Choose Account Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
              1. Select Account Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Simple User Card */}
              <div
                onClick={() => setForm({ ...form, role: "admin" })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  form.role === "admin"
                    ? "border-[#2563EB] bg-blue-50/70 ring-2 ring-[#2563EB]/20 dark:border-[#3B82F6] dark:bg-[#1E293B]"
                    : "border-[#E2E8F0] hover:border-slate-300 dark:border-[#334155] dark:hover:border-slate-600 bg-white dark:bg-[#111827]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-[#3B82F6]">
                      <User size={15} />
                    </div>
                    <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">Simple User</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === "admin"}
                    onChange={() => setForm({ ...form, role: "admin" })}
                    className="text-[#2563EB] focus:ring-[#2563EB]"
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                  Scoped access. Only sees projects they create themselves, subject to project quotas & limitations.
                </p>
              </div>

              {/* Super Admin Card */}
              <div
                onClick={() => setForm({ ...form, role: "superadmin" })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  form.role === "superadmin"
                    ? "border-[#7C3AED] bg-purple-50/70 ring-2 ring-[#7C3AED]/20 dark:border-[#8B5CF6] dark:bg-[#1E293B]"
                    : "border-[#E2E8F0] hover:border-slate-300 dark:border-[#334155] dark:hover:border-slate-600 bg-white dark:bg-[#111827]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-[#7C3AED] dark:bg-purple-950/60 dark:text-[#8B5CF6]">
                      <Crown size={15} />
                    </div>
                    <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">Super Admin</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === "superadmin"}
                    onChange={() => setForm({ ...form, role: "superadmin" })}
                    className="text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                  Main administrator. Sees all projects across the platform, manages team accounts, and unlimited quotas.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: Basic Account Details */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
              2. Member Credentials
            </label>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Full Name *
              </label>
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="e.g. John Doe"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="pl-8 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-8 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Initial Password *
              </label>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-8 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Role-Specific Limitations & Permissions */}
          {form.role === "superadmin" ? (
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 p-3 text-xs text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-300 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Super Admin Privileges</span>
                <p className="mt-0.5 text-[11px] text-purple-700/90 dark:text-purple-300/90 leading-relaxed">
                  As a Super Admin, this user will automatically have access to view, edit, and export all certificate projects created in VeriMoo, and can manage other team members.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Simple User Limitations & Permissions
              </p>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Project Creation Limit (Leave blank for unlimited)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited (∞)"
                  value={form.maxProjects}
                  onChange={(e) => setForm({ ...form, maxProjects: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.canDeleteProjects}
                    onChange={(e) => setForm({ ...form, canDeleteProjects: e.target.checked })}
                    className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                  />
                  <span>Can delete certificate projects</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.canManageParticipants}
                    onChange={(e) => setForm({ ...form, canManageParticipants: e.target.checked })}
                    className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                  />
                  <span>Can add and import participants</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.canManageTemplates}
                    onChange={(e) => setForm({ ...form, canManageTemplates: e.target.checked })}
                    className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                  />
                  <span>Can edit templates and custom fonts</span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="text-xs font-semibold">
              {saving ? "Creating..." : form.role === "superadmin" ? "Create Super Admin" : "Create Simple User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role & Permissions Modal */}
      <Modal
        open={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        title={`Configure Role — ${editAdmin?.name}`}
        maxWidth="max-w-lg"
      >
        {editAdmin && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Account Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Simple User Card */}
                <div
                  onClick={() => setEditRole("admin")}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    editRole === "admin"
                      ? "border-[#2563EB] bg-blue-50/70 ring-2 ring-[#2563EB]/20 dark:border-[#3B82F6] dark:bg-[#1E293B]"
                      : "border-[#E2E8F0] hover:border-slate-300 dark:border-[#334155] dark:hover:border-slate-600 bg-white dark:bg-[#111827]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-[#3B82F6]">
                        <User size={15} />
                      </div>
                      <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">Simple User</span>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === "admin"}
                      onChange={() => setEditRole("admin")}
                      className="text-[#2563EB] focus:ring-[#2563EB]"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    Scoped access. Sees only own projects, subject to limits.
                  </p>
                </div>

                {/* Super Admin Card */}
                <div
                  onClick={() => setEditRole("superadmin")}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    editRole === "superadmin"
                      ? "border-[#7C3AED] bg-purple-50/70 ring-2 ring-[#7C3AED]/20 dark:border-[#8B5CF6] dark:bg-[#1E293B]"
                      : "border-[#E2E8F0] hover:border-slate-300 dark:border-[#334155] dark:hover:border-slate-600 bg-white dark:bg-[#111827]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-[#7C3AED] dark:bg-purple-950/60 dark:text-[#8B5CF6]">
                        <Crown size={15} />
                      </div>
                      <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">Super Admin</span>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === "superadmin"}
                      onChange={() => setEditRole("superadmin")}
                      className="text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    Full access. Sees all projects across platform & manages team.
                  </p>
                </div>
              </div>
            </div>

            {editRole === "superadmin" ? (
              <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 p-3 text-xs text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-300 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Super Admin Privileges</span>
                  <p className="mt-0.5 text-[11px] text-purple-700/90 dark:text-purple-300/90">
                    This user will have full access to all projects, unlimited project creation, and team administration rights.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Simple User Limitations & Permissions
                </p>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Project Creation Limit (Leave blank for unlimited)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Unlimited (∞)"
                    value={editMaxProjects}
                    onChange={(e) => setEditMaxProjects(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canDeleteProjects}
                      onChange={(e) => setEditPermissions({ ...editPermissions, canDeleteProjects: e.target.checked })}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                    />
                    <span>Can delete certificate projects</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageParticipants}
                      onChange={(e) => setEditPermissions({ ...editPermissions, canManageParticipants: e.target.checked })}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                    />
                    <span>Can add and import participants</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageTemplates}
                      onChange={(e) => setEditPermissions({ ...editPermissions, canManageTemplates: e.target.checked })}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] h-3.5 w-3.5"
                    />
                    <span>Can edit templates and custom fonts</span>
                  </label>
                </div>
              </div>
            )}

            {editError && (
              <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                {editError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditAdmin(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" loading={editSaving} className="text-xs font-semibold">
                {editSaving ? "Saving..." : "Save Role & Permissions"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Team Member"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#EF4444]" />
            <p>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong>? They will lose all access to VeriMoo.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={confirmDelete}
              className="text-xs font-semibold"
            >
              {deleting ? "Removing..." : "Yes, Remove Member"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
