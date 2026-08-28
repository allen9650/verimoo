import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Admin from "@/models/Admin";
import { logActivity } from "@/lib/log";

const DEFAULT_FIELDS = [
  { id: "f1", key: "participantName", label: "Participant Name", type: "text", x: 50, y: 40, fontSize: 40, color: "#111111", align: "center", bold: true },
  { id: "f2", key: "courseTitle", label: "Course Title", type: "text", x: 50, y: 52, fontSize: 22, color: "#333333", align: "center" },
  { id: "f3", key: "date", label: "Date", type: "text", x: 50, y: 62, fontSize: 16, color: "#555555", align: "center" },
  { id: "f4", key: "serialNumber", label: "Serial Number", type: "text", x: 15, y: 92, fontSize: 12, color: "#888888", align: "left" },
  { id: "f5", key: "qrCode", label: "QR Code", type: "qr", x: 88, y: 88, size: 100 },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  // Sub-admins only see the projects they created themselves; superadmins
  // see everything.
  const filter = session.user.role === "superadmin" ? {} : { createdBy: session.user.id };
  // The dashboard grid only needs summary info — excluding the (potentially
  // multi-megabyte, base64-encoded) template SVG/image here avoids
  // transferring and re-parsing that payload on every single dashboard load,
  // which was a real contributor to slow page loads.
  const projects = await Project.find(filter)
    .select("-templateSvg -templateImage.data")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
  return NextResponse.json({ projects });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await connectDB();

  const name = String(body.name || "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  // Enforce a sub-admin's project cap, if one is set. Superadmins are
  // never limited.
  if (session.user.role !== "superadmin") {
    const admin = await Admin.findById(session.user.id);
    if (admin?.maxProjects !== null && admin?.maxProjects !== undefined) {
      const currentCount = await Project.countDocuments({ createdBy: session.user.id });
      if (currentCount >= admin.maxProjects) {
        return NextResponse.json(
          { error: `You've reached your limit of ${admin.maxProjects} project${admin.maxProjects === 1 ? "" : "s"}. Ask a superadmin to raise it.` },
          { status: 403 }
        );
      }
    }
  }

  const project = await Project.create({
    name,
    description: String(body.description || "").slice(0, 1000),
    organizationName: String(body.organizationName || "").slice(0, 200),
    serialPrefix: String(body.serialPrefix || "CERT").trim().slice(0, 30),
    // The counter is the *last used* number, so a "starting serial" of 1
    // means the counter begins at 0 (the first generated serial becomes
    // prefix-00001).
    serialCounter: body.startingSerial ? Math.max(0, Number(body.startingSerial) - 1) : 0,
    fields: DEFAULT_FIELDS,
    branding: body.logoDataUrl ? { logoUrl: body.logoDataUrl } : undefined,
    createdBy: session.user.id,
  });
  await logActivity({ project: project._id, admin: session.user.id, action: "created_project", details: project.name });
  return NextResponse.json({ project }, { status: 201 });
}
