import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import Admin from "@/models/Admin";
import { encryptSecret } from "@/lib/crypto";
import { sanitizeSvg } from "@/lib/sanitizeSvg";
import { logActivity } from "@/lib/log";

// Sub-admins may only touch projects they created; superadmins can touch any.
function canAccess(session, project) {
  return session.user.role === "superadmin" || String(project.createdBy) === session.user.id;
}

// Mass-assignment guard: only these top-level fields may be changed via
// PATCH. Without this allowlist, a client could pass arbitrary fields
// (createdBy, _id, serialCounter tampering, etc.) straight through to
// findByIdAndUpdate.
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "description",
  "organizationName",
  "templateSvg",
  "templateImage",
  "templateWidth",
  "templateHeight",
  "fields",
  "serialPrefix",
  "serialCounter",
  "dateFormat",
  "aiSuggestionsEnabled",
  "branding",
  "verificationTemplate",
  "footer",
  "settings",
];

function pickAllowedFields(body) {
  const update = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) update[key] = body[key];
  }
  return update;
}

export async function GET(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const project = await Project.findById(id)
    .select("-emailConfig.gmailAppPasswordEncrypted")
    .populate("createdBy", "name email");
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(session, project)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const participants = await Participant.find({ project: id }).sort({ createdAt: -1 });
  return NextResponse.json({ project, participants });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const existing = await Project.findById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const update = pickAllowedFields(body);

  // Basic input validation/sanitization: cap string lengths and clamp
  // obviously-invalid numeric values rather than trusting client input as-is.
  if (typeof update.name === "string") update.name = update.name.trim().slice(0, 200);
  if (typeof update.serialPrefix === "string") update.serialPrefix = update.serialPrefix.trim().slice(0, 30);
  if (typeof update.templateWidth === "number") update.templateWidth = Math.max(50, Math.min(10000, update.templateWidth));
  if (typeof update.templateHeight === "number") update.templateHeight = Math.max(50, Math.min(10000, update.templateHeight));
  if (typeof update.templateSvg === "string") {
    if (update.templateSvg.length > 2_000_000) {
      return NextResponse.json({ error: "SVG template is too large (max ~2MB)." }, { status: 413 });
    }
    update.templateSvg = sanitizeSvg(update.templateSvg);
  }

  // Email config's app password arrives as plaintext from the settings form
  // and must never be stored that way — encrypt it here, and never let a
  // plaintext password field reach the database under any key.
  if (body.emailConfig) {
    const { gmailAppPassword, ...rest } = body.emailConfig;
    update.emailConfig = { ...existing.emailConfig?.toObject?.(), ...rest };
    if (gmailAppPassword) {
      update.emailConfig.gmailAppPasswordEncrypted = encryptSecret(gmailAppPassword);
    }
  }

  const project = await Project.findByIdAndUpdate(id, update, { returnDocument: "after" }).select(
    "-emailConfig.gmailAppPasswordEncrypted"
  );
  await logActivity({ project: project._id, admin: session.user.id, action: "updated_project" });
  return NextResponse.json({ project });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const existing = await Project.findById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (session.user.role !== "superadmin") {
    const admin = await Admin.findById(session.user.id);
    if (admin?.permissions?.canDeleteProjects === false) {
      return NextResponse.json({ error: "You don't have permission to delete projects." }, { status: 403 });
    }
  }

  await Participant.deleteMany({ project: id });
  await Project.findByIdAndDelete(id);
  await logActivity({ project: id, admin: session.user.id, action: "deleted_project" });
  return NextResponse.json({ ok: true });
}
