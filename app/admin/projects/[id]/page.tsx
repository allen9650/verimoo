"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  Sparkles,
  BookmarkPlus,
  Mail,
  Info,
  Eye,
  ExternalLink,
  Download,
  ArrowLeft,
  Layout,
  Users,
  Settings as SettingsIcon,
  Laptop,
  Lock,
} from "lucide-react";
import { Button, Input, Card, Badge } from "@/components/ui";
import { Modal } from "@/components/modal";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate, DATE_FORMAT_OPTIONS } from "@/lib/dateFormat";
import { VERIFICATION_THEME_OPTIONS } from "@/lib/verificationThemes";
import type { CertificateField, Project, Participant, ImportResult, TextTemplate } from "@/lib/types";

const BUILTIN_KEYS = ["participantName", "serialNumber", "courseTitle", "date", "orgName"];

const BUILTIN_KEY_OPTIONS = [
  { key: "participantName", label: "Participant Name", sample: "Jane Doe" },
  { key: "serialNumber", label: "Serial Number", sample: "CERT-00001" },
  { key: "courseTitle", label: "Course Title", sample: "Web Development Bootcamp" },
  { key: "date", label: "Date", sample: "July 8, 2026" },
  { key: "orgName", label: "Organization Name", sample: "Queue Tech Academy" },
];

// Quick-fill presets for static heading/title text (certificate wording that
// never changes per participant), offered when adding a "+ Title" field.
const HEADING_PRESETS = [
  "Certificate of Appreciation",
  "Certificate of Completion",
  "Certificate of Achievement",
  "Certificate of Participation",
  "Certificate of Excellence",
  "This is to certify that",
  "has successfully completed the course",
  "Awarded to",
];

// "Inter" is listed first and used as the default for new fields — it's the
// exact same font file embedded server-side for certificate rendering
// (assets/fonts/, lib/certificate.js) AND declared via @font-face in
// globals.css for this admin UI, both under the identical family name
// "VeriMooEmbedded" — so it's the one choice guaranteed to look
// pixel-identical between this preview and the exported certificate.
const FONT_OPTIONS = [
  { label: "Inter (recommended — exact preview match)", value: "VeriMooEmbedded, sans-serif" },
  { label: "Helvetica (sans-serif)", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Courier (monospace)", value: "'Courier New', monospace" },
  { label: "Verdana (sans-serif)", value: "Verdana, sans-serif" },
  { label: "Garamond (serif)", value: "Garamond, 'Times New Roman', serif" },
];

// Standard paper sizes at 96 DPI (px), given in *portrait* base dimensions —
// the orientation dropdown swaps width/height from here.
const PAPER_BASE: Record<string, { w: number; h: number }> = {
  Certificate: { w: 700, h: 1000 }, // 10:7 default, swaps to 1000x700 landscape
  A4: { w: 794, h: 1123 },
  A3: { w: 1123, h: 1590 },
  A5: { w: 559, h: 794 },
  Letter: { w: 816, h: 1056 },
  Legal: { w: 816, h: 1344 },
};

type Orientation = "portrait" | "landscape";

function dimsFor(paperSize: string, orientation: Orientation) {
  const base = PAPER_BASE[paperSize];
  if (!base) return null;
  return orientation === "landscape" ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
}

function detectPreset(width: number, height: number) {
  for (const [name, base] of Object.entries(PAPER_BASE)) {
    if (base.w === width && base.h === height) return { paperSize: name, orientation: "portrait" as Orientation };
    if (base.h === width && base.w === height) return { paperSize: name, orientation: "landscape" as Orientation };
  }
  return { paperSize: "Custom", orientation: "landscape" as Orientation };
}

function slugify(label: string) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `custom_${Date.now()}`
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [tab, setTab] = useState<"template" | "participants" | "settings">("template");
  const [search, setSearch] = useState("");
  const [newP, setNewP] = useState({ name: "", email: "", serialNumber: "", courseTitle: "", date: "" });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [wrapperDimensions, setWrapperDimensions] = useState({ width: 0, height: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | "50" | "75" | "100" | "125">("fit");
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [saveTemplateFieldId, setSaveTemplateFieldId] = useState<string | null>(null);
  const [saveTemplateLabel, setSaveTemplateLabel] = useState("");
  const [aiFieldId, setAiFieldId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragField = useRef<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  const [addParticipantError, setAddParticipantError] = useState("");
  const [importing, setImporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [emailPasswordInput, setEmailPasswordInput] = useState("");
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sendEmailResult, setSendEmailResult] = useState<{ sentCount: number; failed: { serialNumber: string; reason: string }[] } | null>(
    null
  );
  const [fontMode, setFontMode] = useState<"upload" | "link">("upload");
  const [fontName, setFontName] = useState("");
  const [fontUrl, setFontUrl] = useState("");
  const [fontUploading, setFontUploading] = useState(false);
  const [fontError, setFontError] = useState("");

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setProject(data.project);
    setParticipants(data.participants || []);
  }

  // Initial fetch on mount/id-change
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!cancelled) {
        setProject(data.project);
        setParticipants(data.participants || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Shared predefined text blocks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/text-templates");
      const data = await res.json();
      if (!cancelled) setTextTemplates(data.templates || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track the actual rendered dimensions of the viewport wrapper so the
  // certificate canvas auto-fits smoothly and never jumps or distorts on tab switches.
  useEffect(() => {
    if (tab !== "template") return;
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setWrapperDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    measure();
    const raf1 = requestAnimationFrame(measure);
    const timeoutId = setTimeout(measure, 150);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setWrapperDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tab, project?.templateWidth, project?.templateHeight, project?.templateSvg, project?.templateImage?.data]);

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    function checkScreen() {
      setIsMobileScreen(window.innerWidth < 768);
    }
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Start dragging a field with smooth click-offset calculation to prevent snapping.
  function handleFieldPointerDown(fieldId: string, e: React.PointerEvent) {
    e.stopPropagation();
    setSelectedFieldId(fieldId);

    // On mobile devices, keep certificate components locked as fixed to protect template design
    if (isMobileScreen || (typeof window !== "undefined" && window.innerWidth < 768)) {
      dragField.current = null;
      return;
    }

    dragField.current = fieldId;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const field = project?.fields.find((f) => f.id === fieldId);
      if (field) {
        const fieldCenterX = rect.left + (field.x / 100) * rect.width;
        const fieldCenterY = rect.top + (field.y / 100) * rect.height;
        dragOffset.current = {
          x: e.clientX - fieldCenterX,
          y: e.clientY - fieldCenterY,
        };
      }
    }
  }

  // Global pointer listeners so dragging keeps working smoothly in every direction
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragField.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const offsetX = dragOffset.current?.x || 0;
      const offsetY = dragOffset.current?.y || 0;

      const targetPixelX = e.clientX - offsetX - rect.left;
      const targetPixelY = e.clientY - offsetY - rect.top;

      const rawX = (targetPixelX / rect.width) * 100;
      const rawY = (targetPixelY / rect.height) * 100;

      const x = Math.min(100, Math.max(0, Math.round(rawX * 10) / 10));
      const y = Math.min(100, Math.max(0, Math.round(rawY * 10) / 10));

      const fieldId = dragField.current;
      setProject((prev) =>
        prev
          ? { ...prev, fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, x, y } : f)) }
          : prev
      );
    }

    function onPointerUp() {
      dragField.current = null;
      dragOffset.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  async function saveProject(patch: Partial<Project>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setProject(data.project);
  }

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

  async function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      window.alert("That file is too large (max 5MB). Try compressing the image first.");
      return;
    }
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvg && !file.type.startsWith("image/")) {
      window.alert("Please upload an SVG or image file.");
      return;
    }
    if (isSvg) {
      const text = await file.text();
      await saveProject({ templateSvg: text, templateImage: undefined });
    } else {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await saveProject({ templateImage: { data: dataUrl, mimeType: file.type }, templateSvg: "" });
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      window.alert("That file is too large (max 5MB). Try compressing the image first.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      window.alert("Please upload an image file.");
      return;
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await saveProject({ branding: { ...project.branding, logoUrl: dataUrl } });
  }

  function applyPaperSize(paperSize: string, orientation: Orientation) {
    if (paperSize === "Custom") return;
    const dims = dimsFor(paperSize, orientation);
    if (dims) saveProject({ templateWidth: dims.w, templateHeight: dims.h });
  }

  function updateFieldLocal(fieldId: string, patch: Partial<CertificateField>) {
    setProject((prev) =>
      prev
        ? { ...prev, fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
        : prev
    );
  }

  function toggleFieldStyle(fieldId: string, key: "bold" | "italic" | "underline", current?: boolean) {
    updateFieldLocal(fieldId, { [key]: !current } as Partial<CertificateField>);
  }

  function addField(type: "text" | "qr" | "logo" | "static") {
    if (type === "logo" && !project?.branding?.logoUrl) {
      window.alert("Upload a project logo first (above), then add it as a field.");
      return;
    }
    const base = { id: `f_${Date.now()}`, x: 50, y: 50, fontFamily: FONT_OPTIONS[0].value };
    const newField: CertificateField =
      type === "qr"
        ? { ...base, key: "qrCode", label: "QR Code", type: "qr", fontSize: 20, color: "#111111", align: "center", size: 100 }
        : type === "logo"
          ? { ...base, key: "logo", label: "Logo", type: "image", fontSize: 20, color: "#111111", align: "center", size: 100 }
          : type === "static"
            ? {
                ...base,
                key: "static",
                label: "Title",
                type: "text",
                fontSize: 36,
                color: "#111111",
                align: "center",
                bold: true,
                content: HEADING_PRESETS[0],
                y: 15,
              }
            : { ...base, key: `custom_${Date.now()}`, label: "Custom Field", type: "text", fontSize: 20, color: "#111111", align: "center" };
    setProject((prev) => (prev ? { ...prev, fields: [...prev.fields, newField] } : prev));
  }

  function removeField(fieldId: string) {
    setProject((prev) => (prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) } : prev));
  }

  async function saveFields() {
    if (!project) return;
    await saveProject({ fields: project.fields });
  }

  const customFieldDefs = (project?.fields || []).filter(
    (f) => f.type === "text" && f.key !== "static" && !BUILTIN_KEYS.includes(f.key)
  );

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    setAddParticipantError("");
    const res = await fetch(`/api/projects/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newP, customFields: customValues }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAddParticipantError(data.error || "Couldn't add participant.");
      return;
    }
    setNewP({ name: "", email: "", serialNumber: "", courseTitle: "", date: "" });
    setCustomValues({});
    load();
  }

  async function deleteParticipant(pid: string) {
    await fetch(`/api/projects/${id}/participants/${pid}`, { method: "DELETE" });
    load();
  }

  async function downloadFile(url: string, filename: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    setDownloadError("");
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/projects/${id}/import`, { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);
    setImportResult(data);
    load();
    e.target.value = "";
  }

  function downloadImportErrorReport() {
    if (!importResult?.errors?.length) return;
    const allKeys = Array.from(new Set(importResult.errors.flatMap((e) => Object.keys(e.row))));
    const header = [...allKeys, "reason"];
    const csvEscape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      header.map(csvEscape).join(","),
      ...importResult.errors.map((e) => [...allKeys.map((k) => e.row[k] ?? ""), e.reason].map(csvEscape).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function markParticipantIssued(pid: string) {
    setParticipants((prev) =>
      prev.map((item) => (item._id === pid ? { ...item, status: "issued" } : item))
    );
  }

  async function handleSendEmails() {
    setSendingEmails(true);
    setSendEmailResult(null);
    const res = await fetch(`/api/projects/${id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setSendingEmails(false);
    if (!res.ok) {
      setSendEmailResult({ sentCount: 0, failed: [{ serialNumber: "", reason: data.error || "Failed to send." }] });
      return;
    }
    setSendEmailResult(data);
    load();
  }

  async function handleFontUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    if (file.size > 3 * 1024 * 1024) {
      setFontError("That font file is too large (max 3MB).");
      return;
    }
    setFontUploading(true);
    setFontError("");
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read font file"));
        reader.readAsDataURL(file);
      });
      const cleanSuggestedName = (fontName || file.name.replace(/\.[^.]+$/, ""))
        .replace(/[-_]+/g, " ")
        .trim();
      const res = await fetch(`/api/projects/${id}/fonts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanSuggestedName,
          fileName: file.name,
          dataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't add that font.");
      }
      setProject((prev) => (prev ? { ...prev, customFonts: data.customFonts } : prev));
      setFontName("");
    } catch (err: unknown) {
      setFontError(err instanceof Error ? err.message : "Failed to upload font.");
    } finally {
      setFontUploading(false);
      e.target.value = "";
    }
  }

  async function handleFontLink(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !fontUrl.trim()) return;
    setFontUploading(true);
    setFontError("");
    try {
      const res = await fetch(`/api/projects/${id}/fonts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fontName.trim() || "", sourceUrl: fontUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't embed a font from that URL.");
      }
      setProject((prev) => (prev ? { ...prev, customFonts: data.customFonts } : prev));
      setFontName("");
      setFontUrl("");
    } catch (err: unknown) {
      setFontError(err instanceof Error ? err.message : "Failed to embed font.");
    } finally {
      setFontUploading(false);
    }
  }

  async function handleDeleteFont(fontFamilyName: string) {
    if (!project) return;
    const res = await fetch(`/api/projects/${id}/fonts?name=${encodeURIComponent(fontFamilyName)}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setProject((prev) => (prev ? { ...prev, customFonts: data.customFonts } : prev));
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!saveTemplateFieldId) return;
    const field = project?.fields.find((f) => f.id === saveTemplateFieldId);
    if (!field?.content) return;
    const res = await fetch("/api/text-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: saveTemplateLabel || field.content.slice(0, 40), content: field.content }),
    });
    if (res.ok) {
      const data = await res.json();
      setTextTemplates((prev) => [data.template, ...prev]);
    }
    setSaveTemplateFieldId(null);
    setSaveTemplateLabel("");
  }

  async function handleAiSuggest(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);
    setAiError("");
    setAiSuggestions([]);
    const res = await fetch("/api/ai/suggest-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    const data = await res.json();
    setAiLoading(false);
    if (!res.ok) {
      setAiError(data.error || "Couldn't get suggestions.");
      return;
    }
    setAiSuggestions(data.suggestions || []);
  }

  function insertAiSuggestion(text: string) {
    if (aiFieldId) updateFieldLocal(aiFieldId, { content: text });
    setAiFieldId(null);
    setAiPrompt("");
    setAiSuggestions([]);
    setAiError("");
  }

  if (!project) return <p className="text-gray-400">Loading project...</p>;

  const filtered = participants.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const templateWidth = project.templateWidth || 1000;
  const templateHeight = project.templateHeight || 700;
  const templateAR = templateWidth / templateHeight;

  // Compute exact fit dimensions when zoomMode === "fit"
  const availW = Math.max(100, (wrapperDimensions.width || 700) - 32);
  const availH = Math.max(100, (wrapperDimensions.height || 500) - 32);
  const availAR = availW / availH;

  let fitWidth = availW;
  let fitHeight = availW / templateAR;

  if (templateAR < availAR) {
    fitHeight = availH;
    fitWidth = availH * templateAR;
  }

  const zoomPercent = zoomMode === "fit" ? (fitWidth / templateWidth) * 100 : Number(zoomMode);
  const canvasWidth = zoomMode === "fit" ? fitWidth : (templateWidth * zoomPercent) / 100;
  const canvasHeight = zoomMode === "fit" ? fitHeight : (templateHeight * zoomPercent) / 100;

  const scale = canvasWidth / templateWidth;
  const { paperSize, orientation } = detectPreset(project.templateWidth, project.templateHeight);

  return (
    <div>
      {project.customFonts?.length > 0 && (
        <style
          dangerouslySetInnerHTML={{
            __html: project.customFonts
              .map(
                (f) =>
                  `@font-face { font-family: '${f.name}'; src: url('${f.data}') format('${
                    (f.mimeType || "").includes("woff2")
                      ? "woff2"
                      : (f.mimeType || "").includes("woff")
                        ? "woff"
                        : (f.mimeType || "").includes("otf") || (f.mimeType || "").includes("opentype")
                          ? "opentype"
                          : "truetype"
                  }'); font-display: swap; }`
              )
              .join("\n"),
          }}
        />
      )}
      {/* Top Project Header & Breadcrumb */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary transition dark:text-gray-400"
          >
            <ArrowLeft size={13} />
            <span>Back to Projects</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {project.name}
            </h1>
            {project.organizationName && (
              <Badge color="gray" className="text-xs">
                {project.organizationName}
              </Badge>
            )}
          </div>
          {project.settings?.creatorInfo !== false && typeof project.createdBy === "object" && project.createdBy && (
            <p className="mt-0.5 text-xs text-gray-400">
              Created by{" "}
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {project.createdBy._id === session?.user?.id ? "Me" : project.createdBy.name || project.createdBy.email}
              </span>
            </p>
          )}
        </div>

        {/* Segmented Tab Switcher */}
        <div className="inline-flex rounded-xl bg-gray-100/90 p-1 dark:bg-gray-800/80 self-start sm:self-auto shadow-inner text-xs sm:text-sm">
          <button
            onClick={() => setTab("template")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
              tab === "template"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white font-semibold"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Layout size={14} className={tab === "template" ? "text-primary" : "text-gray-400"} />
            <span>Design Studio</span>
          </button>
          <button
            onClick={() => setTab("participants")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
              tab === "participants"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white font-semibold"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Users size={14} className={tab === "participants" ? "text-primary" : "text-gray-400"} />
            <span>Participants</span>
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                tab === "participants"
                  ? "bg-primary/10 text-primary font-bold"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {participants.length}
            </span>
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
              tab === "settings"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white font-semibold"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <SettingsIcon size={14} className={tab === "settings" ? "text-primary" : "text-gray-400"} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "template" && (
          <motion.div
            key="template"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Mobile View Advisory Banner */}
            <div className="md:hidden rounded-xl border border-amber-200/90 bg-amber-50/90 p-3.5 text-amber-900 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <Laptop size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-xs leading-relaxed">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold">Desktop / Laptop Recommended</span>
                    <span className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/70 dark:text-amber-200">
                      <Lock size={10} />
                      <span>Canvas Locked on Mobile</span>
                    </span>
                  </div>
                  <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
                    For better view, management, and full drag-and-drop customization, please use a <strong>desktop or laptop</strong> to edit certificates. Field positions are <strong>fixed & locked</strong> on mobile devices to prevent accidental displacement.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="font-semibold text-sm sm:text-base">Certificate Template</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input w-auto text-xs sm:text-sm"
                    value={paperSize}
                    onChange={(e) => applyPaperSize(e.target.value, orientation)}
                  >
                    {Object.keys(PAPER_BASE).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="Custom">Custom</option>
                  </select>
                  <select
                    className="input w-auto text-xs sm:text-sm"
                    value={orientation}
                    disabled={paperSize === "Custom"}
                    onChange={(e) => applyPaperSize(paperSize, e.target.value as Orientation)}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                  <label className="btn-outline cursor-pointer text-xs sm:text-sm">
                    Upload SVG/Image
                    <input type="file" accept=".svg,image/*" className="hidden" onChange={handleTemplateUpload} />
                  </label>
                </div>
              </div>

              {paperSize === "Custom" && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Custom size (px):</span>
                  <Input
                    type="number"
                    className="w-24 sm:w-28"
                    value={project.templateWidth}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, templateWidth: Number(e.target.value) } : prev))}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    className="w-24 sm:w-28"
                    value={project.templateHeight}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, templateHeight: Number(e.target.value) } : prev))}
                  />
                  <Button
                    variant="outline"
                    onClick={() => saveProject({ templateWidth: project.templateWidth, templateHeight: project.templateHeight })}
                  >
                    Apply
                  </Button>
                </div>
              )}

              <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Project logo:</span>
                <label className="btn-outline cursor-pointer !py-1 !px-2 text-xs">
                  {project.branding?.logoUrl ? "Replace logo" : "Upload logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {project.branding?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary data-URI logo
                  <img src={project.branding.logoUrl} alt="Project logo" className="h-8 w-auto object-contain" />
                )}
              </div>

              {/* Viewport Toolbar: Zoom and Dimensions */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-slate-50/80 px-3 py-2 text-xs dark:border-[#334155] dark:bg-[#1E293B]/50">
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                  <span className="font-medium text-[#64748B] dark:text-[#94A3B8]">View:</span>
                  <button
                    type="button"
                    onClick={() => setZoomMode("fit")}
                    className={`rounded px-2 py-1 font-medium transition cursor-pointer ${
                      zoomMode === "fit"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "border border-[#E2E8F0] bg-white hover:bg-slate-100 dark:border-[#334155] dark:bg-[#111827] dark:hover:bg-[#1E293B]"
                    }`}
                  >
                    Auto Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("50")}
                    className={`rounded px-2 py-1 font-medium transition cursor-pointer ${
                      zoomMode === "50"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "border border-[#E2E8F0] bg-white hover:bg-slate-100 dark:border-[#334155] dark:bg-[#111827] dark:hover:bg-[#1E293B]"
                    }`}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("75")}
                    className={`rounded px-2 py-1 font-medium transition cursor-pointer ${
                      zoomMode === "75"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "border border-[#E2E8F0] bg-white hover:bg-slate-100 dark:border-[#334155] dark:bg-[#111827] dark:hover:bg-[#1E293B]"
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("100")}
                    className={`rounded px-2 py-1 font-medium transition cursor-pointer ${
                      zoomMode === "100"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "border border-[#E2E8F0] bg-white hover:bg-slate-100 dark:border-[#334155] dark:bg-[#111827] dark:hover:bg-[#1E293B]"
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("125")}
                    className={`rounded px-2 py-1 font-medium transition cursor-pointer ${
                      zoomMode === "125"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "border border-[#E2E8F0] bg-white hover:bg-slate-100 dark:border-[#334155] dark:bg-[#111827] dark:hover:bg-[#1E293B]"
                    }`}
                  >
                    125%
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {/* Canvas locked indicator on mobile */}
                  <div className="flex md:hidden items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-900/50 rounded-md px-1.5 py-0.5">
                    <Lock size={10} />
                    <span>Positions Fixed on Mobile</span>
                  </div>

                  <span>
                    Original: {project.templateWidth} × {project.templateHeight} px
                  </span>
                  <span>·</span>
                  <span>
                    Display: {Math.round(canvasWidth)} × {Math.round(canvasHeight)} px ({Math.round(scale * 100)}%)
                  </span>
                </div>
              </div>

              {/* Certificate Display and Drag Viewport */}
              <div
                ref={wrapperRef}
                className="relative flex min-h-[380px] h-[520px] max-h-[65vh] w-full items-center justify-center overflow-auto rounded-xl border bg-gray-100/80 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                onClick={() => setSelectedFieldId(null)}
              >
                {project.templateSvg || project.templateImage?.data ? (
                  <div
                    ref={containerRef}
                    className="relative select-none rounded-lg border bg-white shadow-md dark:border-gray-700 dark:bg-gray-950 overflow-hidden flex-shrink-0"
                    style={{
                      width: `${canvasWidth}px`,
                      height: `${canvasHeight}px`,
                    }}
                  >
                    {project.templateImage?.data ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Stretched to fill exactly like the generated certificate does.
                      <img
                        src={project.templateImage.data}
                        alt="Certificate background"
                        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
                      />
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        dangerouslySetInnerHTML={{ __html: project.templateSvg || "" }}
                      />
                    )}
                    {project.fields.map((f) => {
                      const isSelected = selectedFieldId === f.id;
                      const sample =
                        f.key === "static"
                          ? f.content || "[Title text]"
                          : f.key === "orgName"
                            ? project.organizationName || "Organization Name"
                            : BUILTIN_KEY_OPTIONS.find((o) => o.key === f.key)?.sample || `[${f.label}]`;

                      if (f.type === "qr") {
                        const size = (f.size || 100) * scale;
                        return (
                          <div
                            key={f.id}
                            onPointerDown={(e) => handleFieldPointerDown(f.id, e)}
                            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-dashed bg-primary/10 text-[9px] font-medium text-primary select-none transition-colors ${
                              isMobileScreen ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                            } ${
                              isSelected ? "border-primary ring-2 ring-primary/40 shadow-sm z-20" : "border-primary/60 hover:border-primary z-10"
                            }`}
                            style={{ left: `${f.x}%`, top: `${f.y}%`, width: size, height: size }}
                            title={`${isMobileScreen ? "Tap to select (use desktop/laptop to drag)" : "Drag to reposition"} · QR code (X: ${Math.round(f.x * 10) / 10}%, Y: ${Math.round(f.y * 10) / 10}%)`}
                          >
                            <span>▦ QR</span>
                            {isSelected && (
                              <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900/90 px-1.5 py-0.5 text-[9px] font-mono text-white shadow-sm dark:bg-black/90">
                                {Math.round(f.x * 10) / 10}%, {Math.round(f.y * 10) / 10}%
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (f.type === "image" && f.key === "logo") {
                        const size = (f.size || 100) * scale;
                        return (
                          <div
                            key={f.id}
                            onPointerDown={(e) => handleFieldPointerDown(f.id, e)}
                            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-dashed select-none transition-colors ${
                              isMobileScreen ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                            } ${
                              isSelected ? "border-primary ring-2 ring-primary/40 shadow-sm z-20" : "border-primary/40 hover:border-primary/80 z-10"
                            }`}
                            style={{ left: `${f.x}%`, top: `${f.y}%`, width: size, height: size }}
                            title={`${isMobileScreen ? "Tap to select (use desktop/laptop to drag)" : "Drag to reposition"} · Logo (X: ${Math.round(f.x * 10) / 10}%, Y: ${Math.round(f.y * 10) / 10}%)`}
                          >
                            {project.branding?.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- data-URI logo preview
                              <img src={project.branding.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain pointer-events-none" />
                            ) : (
                              <span className="text-[9px] text-primary">Logo</span>
                            )}
                            {isSelected && (
                              <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900/90 px-1.5 py-0.5 text-[9px] font-mono text-white shadow-sm dark:bg-black/90">
                                {Math.round(f.x * 10) / 10}%, {Math.round(f.y * 10) / 10}%
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={f.id}
                          onPointerDown={(e) => handleFieldPointerDown(f.id, e)}
                          className={`absolute whitespace-nowrap select-none ${
                            isMobileScreen ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                          } ${
                            isSelected ? "outline-dashed outline-2 outline-primary/80 ring-2 ring-primary/20 rounded px-1 -mx-1 z-20" : "hover:outline-dashed hover:outline-1 hover:outline-primary/40 z-10"
                          }`}
                          style={{
                            left: `${f.x}%`,
                            top: `${f.y}%`,
                            transform:
                              f.align === "left"
                                ? "translateY(-50%)"
                                : f.align === "right"
                                  ? "translate(-100%, -50%)"
                                  : "translate(-50%, -50%)",
                            fontSize: `${Math.max(f.fontSize * scale, 6)}px`,
                            color: f.color,
                            fontFamily: f.fontFamily || "Helvetica, Arial, sans-serif",
                            letterSpacing: f.letterSpacing ? `${f.letterSpacing * scale}px` : undefined,
                            fontWeight: f.bold ? 700 : 400,
                            fontStyle: f.italic ? "italic" : "normal",
                            textDecoration: f.underline ? "underline" : "none",
                            textAlign: f.align,
                          }}
                          title={`Drag to reposition · ${f.label} (X: ${Math.round(f.x * 10) / 10}%, Y: ${Math.round(f.y * 10) / 10}%)`}
                        >
                          {sample}
                          {isSelected && (
                            <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900/90 px-1.5 py-0.5 text-[9px] font-mono text-white shadow-sm dark:bg-black/90">
                              {Math.round(f.x * 10) / 10}%, {Math.round(f.y * 10) / 10}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed text-gray-400">
                    Upload a certificate template (SVG or image) to get started
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-400">
                  Tip: Drag any field directly to reposition, or select it to fine-tune exact X/Y coordinates and sizes on the right.
                </p>
                {(project.templateSvg || project.templateImage?.data) && (
                  <Button onClick={saveFields}>
                    Save field positions
                  </Button>
                )}
              </div>
            </Card>

            <Card className="lg:col-span-1 min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-sm sm:text-base">Fields</h2>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => addField("static")}>
                    + Title
                  </Button>
                  <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => addField("text")}>
                    + Text
                  </Button>
                  <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => addField("qr")}>
                    + QR Code
                  </Button>
                  <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => addField("logo")}>
                    + Logo
                  </Button>
                </div>
              </div>
              <div className="space-y-3 max-h-[560px] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {project.fields.map((f) => {
                    const isStatic = f.key === "static";
                    const isCustom = f.type === "text" && !isStatic && !BUILTIN_KEYS.includes(f.key);
                    const isSelected = selectedFieldId === f.id;
                    return (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setSelectedFieldId(f.id)}
                        className={`overflow-hidden rounded-lg border p-3 text-sm transition-all dark:border-gray-800 ${
                          isSelected ? "ring-2 ring-primary border-primary bg-primary/[0.03]" : ""
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Badge color={f.type === "qr" ? "yellow" : f.type === "image" ? "yellow" : isStatic ? "yellow" : "gray"}>
                            {f.type === "qr" ? "QR Code" : f.type === "image" ? "Logo" : isStatic ? "Title" : "Text"}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(f.id);
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>

                        <Input
                          className="mb-2"
                          value={f.label}
                          onChange={(e) => updateFieldLocal(f.id, { label: e.target.value })}
                          placeholder="Label"
                        />

                        {isStatic && (
                          <>
                            <select
                              className="input mb-2"
                              value={
                                HEADING_PRESETS.includes(f.content || "") || textTemplates.some((t) => t.content === f.content)
                                  ? f.content
                                  : "__custom__"
                              }
                              onChange={(e) => {
                                if (e.target.value !== "__custom__") updateFieldLocal(f.id, { content: e.target.value });
                              }}
                            >
                              <optgroup label="Presets">
                                {HEADING_PRESETS.map((preset) => (
                                  <option key={preset} value={preset}>
                                    {preset}
                                  </option>
                                ))}
                              </optgroup>
                              {textTemplates.length > 0 && (
                                <optgroup label="Your saved templates">
                                  {textTemplates.map((t) => (
                                    <option key={t._id} value={t.content}>
                                      {t.label}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="__custom__">Custom wording…</option>
                            </select>
                            <Input
                              className="mb-2"
                              value={f.content || ""}
                              onChange={(e) => updateFieldLocal(f.id, { content: e.target.value })}
                              placeholder="Title / heading text"
                            />
                            <div className="mb-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSaveTemplateFieldId(f.id);
                                  setSaveTemplateLabel((f.content || "").slice(0, 40));
                                }}
                                disabled={!f.content}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 py-1.5 text-xs disabled:opacity-40 dark:border-gray-700"
                              >
                                <BookmarkPlus size={13} /> Save as template
                              </button>
                              {project.aiSuggestionsEnabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAiFieldId(f.id);
                                    setAiPrompt(f.content || "");
                                  }}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/5 py-1.5 text-xs text-primary"
                                >
                                  <Sparkles size={13} /> AI Suggest
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {f.type === "text" && !isStatic && (
                          <select
                            className="input mb-2"
                            value={isCustom ? "custom" : f.key}
                            onChange={(e) => {
                              if (e.target.value === "custom") {
                                updateFieldLocal(f.id, { key: slugify(f.label) });
                              } else {
                                updateFieldLocal(f.id, { key: e.target.value });
                              }
                            }}
                          >
                            {BUILTIN_KEY_OPTIONS.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                            <option value="custom">Custom Text…</option>
                          </select>
                        )}

                        {isCustom && (
                          <Input
                            className="mb-2"
                            value={f.key}
                            onChange={(e) => updateFieldLocal(f.id, { key: e.target.value })}
                            placeholder="Field key (matches spreadsheet column name)"
                          />
                        )}

                        {/* Position controls (X%, Y%) and Quick Center buttons */}
                        <div className="mb-2 rounded-md border bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-900/30">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Position X (%)
                              </label>
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={Math.round(f.x * 10) / 10}
                                onChange={(e) =>
                                  updateFieldLocal(f.id, {
                                    x: Math.min(100, Math.max(0, Number(e.target.value))),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Position Y (%)
                              </label>
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={Math.round(f.y * 10) / 10}
                                onChange={(e) =>
                                  updateFieldLocal(f.id, {
                                    y: Math.min(100, Math.max(0, Number(e.target.value))),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="mt-1.5 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateFieldLocal(f.id, { x: 50 })}
                              className="flex-1 rounded border border-gray-200 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              Center X
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFieldLocal(f.id, { y: 50 })}
                              className="flex-1 rounded border border-gray-200 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              Center Y
                            </button>
                          </div>
                        </div>

                        {f.type === "text" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Font size (px)</label>
                              <Input
                                type="number"
                                value={f.fontSize}
                                onChange={(e) => updateFieldLocal(f.id, { fontSize: Number(e.target.value) })}
                                placeholder="Font size"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Text color</label>
                              <Input
                                type="color"
                                value={f.color}
                                onChange={(e) => updateFieldLocal(f.id, { color: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2 flex gap-1">
                              <button
                                type="button"
                                title="Bold"
                                onClick={() => toggleFieldStyle(f.id, "bold", f.bold)}
                                className={`flex-1 rounded-md border py-1.5 flex items-center justify-center ${
                                  f.bold ? "border-primary bg-primary/10 text-primary" : "border-gray-300 dark:border-gray-700"
                                }`}
                              >
                                <Bold size={14} />
                              </button>
                              <button
                                type="button"
                                title="Italic"
                                onClick={() => toggleFieldStyle(f.id, "italic", f.italic)}
                                className={`flex-1 rounded-md border py-1.5 flex items-center justify-center ${
                                  f.italic ? "border-primary bg-primary/10 text-primary" : "border-gray-300 dark:border-gray-700"
                                }`}
                              >
                                <Italic size={14} />
                              </button>
                              <button
                                type="button"
                                title="Underline"
                                onClick={() => toggleFieldStyle(f.id, "underline", f.underline)}
                                className={`flex-1 rounded-md border py-1.5 flex items-center justify-center ${
                                  f.underline ? "border-primary bg-primary/10 text-primary" : "border-gray-300 dark:border-gray-700"
                                }`}
                              >
                                <Underline size={14} />
                              </button>
                            </div>
                            <select
                              className="input col-span-2"
                              value={f.align}
                              onChange={(e) => updateFieldLocal(f.id, { align: e.target.value as CertificateField["align"] })}
                            >
                              <option value="left">Align left</option>
                              <option value="center">Align center</option>
                              <option value="right">Align right</option>
                            </select>
                            {project.settings?.fontCustomization !== false && (
                              <>
                                <select
                                  className="input col-span-2"
                                  value={f.fontFamily || "Helvetica, Arial, sans-serif"}
                                  onChange={(e) => updateFieldLocal(f.id, { fontFamily: e.target.value })}
                                >
                                  <optgroup label="Built-in">
                                    {FONT_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {project.customFonts?.length > 0 && (
                                    <optgroup label="This project's fonts">
                                      {project.customFonts.map((cf) => (
                                        <option key={cf.name} value={`${cf.name}, sans-serif`}>
                                          {cf.name.replace(/^VeriMooCustom_/, "")}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={f.letterSpacing || 0}
                                  onChange={(e) => updateFieldLocal(f.id, { letterSpacing: Number(e.target.value) })}
                                  placeholder="Letter spacing (px)"
                                  className="col-span-2"
                                />
                              </>
                            )}
                          </div>
                        )}
                        {(f.type === "qr" || f.type === "image") && (
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              {f.type === "qr" ? "QR Code Size (px)" : "Logo Size (px)"}
                            </label>
                            <Input
                              type="number"
                              value={f.size}
                              onChange={(e) => updateFieldLocal(f.id, { size: Number(e.target.value) })}
                              placeholder={f.type === "qr" ? "QR size (px)" : "Logo size (px)"}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Card>
            </div>
          </motion.div>
        )}

        {tab === "participants" && (
          <motion.div
            key="participants"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            <Card>
              <h2 className="mb-3 font-semibold">Add participant manually</h2>
              <form onSubmit={addParticipant} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Input placeholder="Name" required value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} />
                <Input placeholder="Email" value={newP.email} onChange={(e) => setNewP({ ...newP, email: e.target.value })} />
                <Input
                  placeholder={`Serial (auto: ${project.serialPrefix}-${String(project.serialCounter + 1).padStart(5, "0")})`}
                  value={newP.serialNumber}
                  onChange={(e) => setNewP({ ...newP, serialNumber: e.target.value })}
                />
                <Input placeholder="Course title" value={newP.courseTitle} onChange={(e) => setNewP({ ...newP, courseTitle: e.target.value })} />
                <Input
                  type="date"
                  value={newP.date}
                  onChange={(e) => setNewP({ ...newP, date: e.target.value })}
                  title={newP.date ? `Will display as ${formatDate(newP.date, project.dateFormat)}` : "Date"}
                />
                <Button type="submit">Add</Button>
              </form>
              {addParticipantError && <p className="mt-2 text-sm text-red-600">{addParticipantError}</p>}

              {customFieldDefs.length > 0 && (
                <div className="mt-3 grid gap-3 border-t pt-3 dark:border-gray-800 sm:grid-cols-3 lg:grid-cols-6">
                  {customFieldDefs.map((f) => (
                    <Input
                      key={f.id}
                      placeholder={f.label}
                      value={customValues[f.key] || ""}
                      onChange={(e) => setCustomValues({ ...customValues, [f.key]: e.target.value })}
                    />
                  ))}
                </div>
              )}

              <div className="mt-4 border-t pt-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="btn-outline cursor-pointer">
                    Import from Excel/CSV
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} disabled={importing} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowImportInfo((s) => !s)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary dark:text-gray-400"
                  >
                    <Info size={13} /> Expected format
                  </button>
                </div>

                {importing && project.settings?.loadingAnimations !== false && <ProgressBar label="Processing rows..." />}
                {importing && project.settings?.loadingAnimations === false && (
                  <p className="mt-2 text-xs text-gray-400">Processing rows...</p>
                )}

                {showImportInfo && (
                  <div className="mt-3 overflow-x-auto rounded-lg border text-xs dark:border-gray-800">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-2">Column</th>
                          <th className="px-3 py-2">Required?</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t dark:border-gray-800">
                          <td className="px-3 py-1.5 font-mono">name</td>
                          <td className="px-3 py-1.5">Required</td>
                          <td className="px-3 py-1.5">Text</td>
                          <td className="px-3 py-1.5">Jane Doe</td>
                        </tr>
                        <tr className="border-t dark:border-gray-800">
                          <td className="px-3 py-1.5 font-mono">email</td>
                          <td className="px-3 py-1.5">Optional</td>
                          <td className="px-3 py-1.5">Email</td>
                          <td className="px-3 py-1.5">jane@example.com</td>
                        </tr>
                        <tr className="border-t dark:border-gray-800">
                          <td className="px-3 py-1.5 font-mono">courseTitle</td>
                          <td className="px-3 py-1.5">Optional</td>
                          <td className="px-3 py-1.5">Text</td>
                          <td className="px-3 py-1.5">Web Development Bootcamp</td>
                        </tr>
                        <tr className="border-t dark:border-gray-800">
                          <td className="px-3 py-1.5 font-mono">date</td>
                          <td className="px-3 py-1.5">Optional</td>
                          <td className="px-3 py-1.5">Date ({project.dateFormat})</td>
                          <td className="px-3 py-1.5">{formatDate(new Date(), project.dateFormat)}</td>
                        </tr>
                        <tr className="border-t dark:border-gray-800">
                          <td className="px-3 py-1.5 font-mono">serialNumber</td>
                          <td className="px-3 py-1.5">Optional (auto if blank)</td>
                          <td className="px-3 py-1.5">Text</td>
                          <td className="px-3 py-1.5">{project.serialPrefix}-00001</td>
                        </tr>
                        {customFieldDefs.map((f) => (
                          <tr key={f.id} className="border-t dark:border-gray-800">
                            <td className="px-3 py-1.5 font-mono">{f.key}</td>
                            <td className="px-3 py-1.5">Optional (custom)</td>
                            <td className="px-3 py-1.5">Text</td>
                            <td className="px-3 py-1.5">—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="border-t p-2 text-gray-400 dark:border-gray-800">
                      Any other column header not listed here is captured automatically as a custom field.
                    </p>
                  </div>
                )}

                {importResult && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge color="green">{importResult.createdCount} imported</Badge>
                      {importResult.errors?.length > 0 && <Badge color="red">{importResult.errors.length} skipped</Badge>}
                      {importResult.errors?.length > 0 && (
                        <button onClick={downloadImportErrorReport} className="text-xs text-primary hover:underline">
                          Download error report (CSV)
                        </button>
                      )}
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border text-xs dark:border-gray-800">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                            <tr>
                              <th className="px-3 py-1.5">Row</th>
                              <th className="px-3 py-1.5">Reason skipped</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.errors.map((e, i) => (
                              <tr key={i} className="border-t dark:border-gray-800">
                                <td className="px-3 py-1.5">{e.row.name || e.row.Name || JSON.stringify(e.row).slice(0, 40)}</td>
                                <td className="px-3 py-1.5 text-red-500">{e.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-sm sm:text-base">Participants</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Search by name or serial..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-60 text-xs sm:text-sm"
                  />
                  <button
                    className="btn-outline text-xs sm:text-sm"
                    disabled={exportingExcel}
                    onClick={() => downloadFile(`/api/projects/${id}/export`, `${project.name}-participants.xlsx`, setExportingExcel)}
                  >
                    {exportingExcel ? "Exporting..." : "Export Excel"}
                  </button>
                  <button
                    className="btn-outline text-xs sm:text-sm"
                    disabled={exportingZip}
                    onClick={() => {
                      setParticipants((prev) =>
                        prev.map((item) =>
                          item.status === "pending" || item.status === "generated"
                            ? { ...item, status: "issued" }
                            : item
                        )
                      );
                      downloadFile(
                        `/api/projects/${id}/certificates/zip`,
                        `${project.name}-certificates.zip`,
                        setExportingZip
                      );
                    }}
                  >
                    {exportingZip ? "Generating ZIP..." : "Download All (ZIP of PNGs)"}
                  </button>
                </div>
              </div>
              {(exportingExcel || exportingZip) && (
                <ProgressBar label={exportingZip ? "Rendering high-resolution certificates..." : "Preparing export..."} />
              )}
              {downloadError && <p className="mt-2 text-sm text-red-600">{downloadError}</p>}
              <p className="mb-3 text-xs text-gray-400">
                Print tip: PNGs are rendered at 300 DPI, matching the selected page size exactly.
                For best results, print at <strong>100% (Actual Size)</strong> and turn off any
                &quot;Fit to Page&quot; scaling.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-4">Serial</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Course</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const isIssued = p.status === "issued" || p.status === "generated";
                      const isEmailed = p.status === "emailed";
                      return (
                        <tr key={p._id} className="border-t dark:border-gray-800">
                          <td className="py-2 pr-4 font-mono text-xs">{p.serialNumber}</td>
                          <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{p.courseTitle || "—"}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{formatDate(p.date, project.dateFormat)}</td>
                          <td className="py-2 pr-4">
                            <Badge
                              color={isIssued ? "green" : isEmailed ? "purple" : "yellow"}
                              dot
                            >
                              {isIssued ? "Issued" : isEmailed ? "Emailed" : "Pending"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewParticipant(p);
                                  markParticipantIssued(p._id);
                                }}
                                className="flex items-center gap-1 text-primary hover:underline font-medium"
                                title="Preview certificate"
                              >
                                <Eye size={14} /> Preview
                              </button>
                              <a
                                className="text-gray-600 hover:text-primary hover:underline dark:text-gray-300"
                                href={`/api/certificate/${p.serialNumber}?format=png`}
                                onClick={() => markParticipantIssued(p._id)}
                                title="Download 300 DPI HD PNG certificate"
                              >
                                Download HD PNG
                              </a>
                              <button className="text-red-500 hover:underline" onClick={() => deleteParticipant(p._id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400">
                          No participants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            <Card>
              <h2 className="mb-3 font-semibold">Serial numbers</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Prefix</label>
                  <Input
                    value={project.serialPrefix}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, serialPrefix: e.target.value } : prev))}
                    onBlur={() => saveProject({ serialPrefix: project.serialPrefix })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Next auto-generated serial starts after</label>
                  <Input
                    type="number"
                    value={project.serialCounter}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, serialCounter: Number(e.target.value) } : prev))}
                    onBlur={() => saveProject({ serialCounter: project.serialCounter })}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                e.g. prefix <code>{project.serialPrefix}</code> with counter <code>{project.serialCounter}</code> →
                next auto-generated serial is <code>{project.serialPrefix}-{String(project.serialCounter + 1).padStart(5, "0")}</code>.
                Manual serial numbers entered per-participant bypass this entirely.
              </p>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Date format</h2>
              <select
                className="input max-w-xs"
                value={project.dateFormat}
                onChange={(e) => saveProject({ dateFormat: e.target.value })}
              >
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} (e.g. {opt.example})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-400">
                Controls how dates are displayed on certificates, the verification page, and Excel exports —
                not how you type them in (the date picker handles that consistently either way).
              </p>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">AI text suggestions</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.aiSuggestionsEnabled}
                  onChange={(e) => saveProject({ aiSuggestionsEnabled: e.target.checked })}
                />
                Show the &quot;AI Suggest&quot; button on title/heading fields
              </label>
              <p className="mt-2 text-xs text-gray-400">
                Uses the Gemini API to draft certificate wording. Requires <code>GEMINI_API_KEY</code> to be
                configured on the server, and is subject to each admin&apos;s token quota.
              </p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">Custom Fonts</h2>
                    <Badge color={project.customFonts?.length >= 3 ? "red" : project.customFonts?.length > 0 ? "indigo" : "gray"}>
                      {project.customFonts?.length || 0} / 3 used
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Upload or embed custom fonts (.woff2, .woff, .ttf, .otf) for your certificates. They will be embedded into exported PDFs, SVGs, and live previews.
                  </p>
                </div>
              </div>

              {project.customFonts?.length > 0 && (
                <div className="mb-4 space-y-2.5">
                  {project.customFonts.map((f) => {
                    const format = (f.mimeType || "").includes("woff2")
                      ? "WOFF2"
                      : (f.mimeType || "").includes("woff")
                        ? "WOFF"
                        : (f.mimeType || "").includes("otf") || (f.mimeType || "").includes("opentype")
                          ? "OTF"
                          : "TTF";
                    const cleanDisplayName = f.name.replace(/^VeriMooCustom_/, "").replace(/_/g, " ");

                    return (
                      <div
                        key={f.name}
                        className="rounded-lg border bg-gray-50/60 p-3 text-sm transition dark:border-gray-800 dark:bg-gray-900/40"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{cleanDisplayName}</span>
                            <Badge color="gray">{format}</Badge>
                          </div>
                          <button
                            onClick={() => handleDeleteFont(f.name)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="rounded border bg-white p-2.5 dark:border-gray-700 dark:bg-gray-950">
                          <p
                            style={{ fontFamily: `'${f.name}', sans-serif` }}
                            className="text-base text-gray-900 dark:text-gray-100 leading-snug"
                          >
                            Certificate of Excellence — Jane Doe 12345
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {project.customFonts?.length >= 3 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  Maximum limit of 3 custom fonts reached. Remove one above if you want to add another.
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => setFontMode("upload")}
                      className={`font-medium transition pb-1 border-b-2 ${
                        fontMode === "upload"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      Upload font file
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontMode("link")}
                      className={`font-medium transition pb-1 border-b-2 ${
                        fontMode === "link"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      Embed from Google Fonts / Link
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Input
                      placeholder="Font name (optional, e.g. Great Vibes / Montserrat)"
                      value={fontName}
                      onChange={(e) => setFontName(e.target.value)}
                    />

                    {fontMode === "upload" ? (
                      <div>
                        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/[0.02] dark:border-gray-700 dark:bg-gray-900/40">
                          <span className="text-sm font-medium text-primary">
                            {fontUploading ? "Processing font..." : "Choose font file (.woff2, .woff, .ttf, .otf)"}
                          </span>
                          <span className="mt-1 text-[11px] text-gray-400">
                            Directly upload any standard font file (up to 3MB)
                          </span>
                          <input
                            type="file"
                            accept=".woff2,.woff,.ttf,.otf,font/*"
                            className="hidden"
                            onChange={handleFontUpload}
                            disabled={fontUploading}
                          />
                        </label>
                      </div>
                    ) : (
                      <form onSubmit={handleFontLink} className="flex gap-2">
                        <Input
                          placeholder="https://fonts.googleapis.com/css2?family=Great+Vibes or direct .woff2 URL"
                          value={fontUrl}
                          onChange={(e) => setFontUrl(e.target.value)}
                        />
                        <Button type="submit" disabled={fontUploading || !fontUrl.trim()}>
                          {fontUploading ? "Embedding..." : "Embed"}
                        </Button>
                      </form>
                    )}
                  </div>

                  {fontUploading && <ProgressBar label="Analyzing and embedding font..." />}
                  {fontError && <p className="mt-2 text-sm text-red-600 font-medium">{fontError}</p>}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Verification page</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Certificate type / theme</label>
                  <select
                    className="input"
                    value={project.verificationTemplate}
                    onChange={(e) => saveProject({ verificationTemplate: e.target.value })}
                  >
                    {VERIFICATION_THEME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Footer — company name</label>
                  <Input
                    value={project.footer?.companyName || ""}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, footer: { ...prev.footer, companyName: e.target.value } } : prev))}
                    onBlur={() => saveProject({ footer: project.footer })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Footer — contact email</label>
                  <Input
                    type="email"
                    value={project.footer?.contactEmail || ""}
                    onChange={(e) => setProject((prev) => (prev ? { ...prev, footer: { ...prev.footer, contactEmail: e.target.value } } : prev))}
                    onBlur={() => saveProject({ footer: project.footer })}
                  />
                </div>
              </div>
              <a
                href={participants[0] ? `/verify/${participants[0].serialNumber}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs text-primary hover:underline"
              >
                Preview a verification page →
              </a>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Email certificates (Gmail)</h2>
                <Mail size={16} className="text-gray-400" />
              </div>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.settings?.emailSending ?? false}
                  onChange={(e) =>
                    setProject((prev) =>
                      prev ? { ...prev, settings: { ...prev.settings, emailSending: e.target.checked } } : prev
                    )
                  }
                  onBlur={() => saveProject({ settings: project.settings })}
                />
                Enable emailing certificates from this project
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="email"
                  placeholder="Your Gmail address"
                  value={project.emailConfig?.gmailAddress || ""}
                  onChange={(e) =>
                    setProject((prev) => (prev ? { ...prev, emailConfig: { ...prev.emailConfig, enabled: true, gmailAddress: e.target.value } } : prev))
                  }
                  onBlur={() => saveProject({ emailConfig: { ...project.emailConfig, enabled: true } })}
                />
                <Input
                  type="password"
                  placeholder="Gmail app password"
                  value={emailPasswordInput}
                  onChange={(e) => setEmailPasswordInput(e.target.value)}
                  onBlur={() => {
                    if (emailPasswordInput) {
                      saveProject({ emailConfig: { ...project.emailConfig, enabled: true, gmailAppPassword: emailPasswordInput } });
                      setEmailPasswordInput("");
                    }
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Uses a Gmail{" "}
                <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer" className="underline">
                  app password
                </a>{" "}
                (not your normal password) over SMTP — stored encrypted, never shown again once saved.
              </p>
              <Button
                className="mt-3"
                variant="outline"
                disabled={!project.settings?.emailSending || !project.emailConfig?.gmailAddress || sendingEmails}
                onClick={handleSendEmails}
              >
                {sendingEmails ? "Sending..." : `Send to all participants with an email (${participants.filter((p) => p.email).length})`}
              </Button>
              {sendingEmails && <ProgressBar label="Generating certificates and sending emails..." />}
              {sendEmailResult && (
                <p className="mt-2 text-sm">
                  {sendEmailResult.sentCount > 0 && <span className="text-green-600">{sendEmailResult.sentCount} sent. </span>}
                  {sendEmailResult.failed.length > 0 && (
                    <span className="text-red-600">{sendEmailResult.failed.length} failed: {sendEmailResult.failed[0].reason}</span>
                  )}
                </p>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Optional features</h2>
              <p className="mb-3 text-xs text-gray-400">
                Turn individual features on or off for this project only — other projects are unaffected.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["verificationFooter", "Verification page footer"],
                    ["verificationTemplates", "Themed verification page"],
                    ["logoDisplay", "Show logo"],
                    ["creatorInfo", "Show creator info"],
                    ["fontCustomization", "Font customization"],
                    ["locationTracking", "Show organization on verify page"],
                    ["certificateVerificationPage", "Public verification page"],
                    ["qrCode", "QR code on certificates"],
                    ["customBranding", "Custom branding"],
                    ["importValidation", "Strict import validation"],
                    ["loadingAnimations", "Loading animations"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={project.settings?.[key] ?? true}
                      onChange={(e) => {
                        const settings = { ...project.settings, [key]: e.target.checked };
                        setProject((prev) => (prev ? { ...prev, settings } : prev));
                        saveProject({ settings });
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!saveTemplateFieldId} onClose={() => setSaveTemplateFieldId(null)} title="Save as reusable template">
        <form onSubmit={handleSaveTemplate} className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This wording will be available to insert with one click on any project&apos;s title/heading fields.
          </p>
          <Input
            placeholder="Template name (e.g. Excellence heading)"
            value={saveTemplateLabel}
            onChange={(e) => setSaveTemplateLabel(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Save template
          </Button>
        </form>
      </Modal>

      <Modal open={!!aiFieldId} onClose={() => setAiFieldId(null)} title="AI text suggestions">
        <form onSubmit={handleAiSuggest} className="space-y-3">
          <Input
            placeholder='e.g. "Award wording for a coding bootcamp completion certificate"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <Button type="submit" disabled={aiLoading} className="w-full">
            {aiLoading ? "Thinking..." : "Get suggestions"}
          </Button>
          {aiError && <p className="text-sm text-red-600">{aiError}</p>}
        </form>
        {aiSuggestions.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-3 dark:border-gray-800">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => insertAiSuggestion(s)}
                className="block w-full rounded-lg border border-gray-200 p-2 text-left text-sm hover:border-primary hover:bg-primary/5 dark:border-gray-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={!!previewParticipant}
        onClose={() => setPreviewParticipant(null)}
        title={previewParticipant ? `Certificate Preview — ${previewParticipant.name}` : "Certificate Preview"}
        maxWidth="max-w-4xl"
      >
        {previewParticipant && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Serial: <strong className="font-mono text-gray-700 dark:text-gray-200">{previewParticipant.serialNumber}</strong>
                </span>
                {previewParticipant.courseTitle && (
                  <>
                    <span>·</span>
                    <span>Course: <strong className="text-gray-700 dark:text-gray-200">{previewParticipant.courseTitle}</strong></span>
                  </>
                )}
                {previewParticipant.date && (
                  <>
                    <span>·</span>
                    <span>Date: <strong className="text-gray-700 dark:text-gray-200">{formatDate(previewParticipant.date, project.dateFormat)}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="relative flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-lg border bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
              {/* eslint-disable-next-line @next/next/no-img-element -- Live generated certificate SVG */}
              <img
                src={`/api/certificate/${previewParticipant.serialNumber}`}
                alt={`Certificate for ${previewParticipant.name}`}
                className="max-h-[60vh] w-auto max-w-full rounded object-contain shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/certificate/${previewParticipant.serialNumber}?format=png`}
                  className="btn-primary flex items-center gap-1.5 text-xs shadow-xs"
                >
                  <Download size={14} /> Download HD PNG
                </a>
                <a
                  href={`/api/certificate/${previewParticipant.serialNumber}?format=svg-download`}
                  className="btn-outline flex items-center gap-1.5 text-xs shadow-xs"
                >
                  <Download size={14} className="text-[#2563EB] dark:text-[#3B82F6]" /> Download SVG
                </a>
                <a
                  href={`/api/certificate/${previewParticipant.serialNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
                <a
                  href={`/verify/${previewParticipant.serialNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline flex items-center gap-1.5 text-xs"
                >
                  Verify Page →
                </a>
              </div>
              <Button variant="outline" onClick={() => setPreviewParticipant(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
