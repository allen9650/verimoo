import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { logActivity } from "@/lib/log";

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "superadmin") {
    return { error: NextResponse.json({ error: "Only a superadmin can manage team members." }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const { session, error } = await requireSuperadmin();
  if (error) return error;

  const body = await req.json();
  await connectDB();
  const update = {};

  if (body.role && ["superadmin", "admin"].includes(body.role)) {
    update.role = body.role;
    if (body.role === "superadmin") {
      update.maxProjects = null;
      update.permissions = {
        canDeleteProjects: true,
        canManageParticipants: true,
        canManageTemplates: true,
      };
    }
  }

  if ("maxProjects" in body && update.role !== "superadmin") {
    update.maxProjects = body.maxProjects === "" || body.maxProjects === null ? null : Number(body.maxProjects);
  }
  if ("aiTokenLimit" in body) {
    update.aiTokenLimit = body.aiTokenLimit === "" || body.aiTokenLimit === null ? null : Number(body.aiTokenLimit);
  }
  if (body.permissions && update.role !== "superadmin") {
    update.permissions = body.permissions;
  }

  const admin = await Admin.findByIdAndUpdate(id, update, { returnDocument: "after" }).select("-passwordHash");
  if (!admin) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

  await logActivity({
    admin: session.user.id,
    action: "updated_team_member",
    details: `${admin.email} (role: ${admin.role})`,
  });

  return NextResponse.json({ admin });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const { session, error } = await requireSuperadmin();
  if (error) return error;

  await connectDB();
  const admin = await Admin.findByIdAndDelete(id);
  await logActivity({ admin: session.user.id, action: "removed_team_member", details: admin?.email });
  return NextResponse.json({ ok: true });
}
