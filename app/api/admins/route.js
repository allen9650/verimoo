import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import Project from "@/models/Project";
import { logActivity } from "@/lib/log";

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "superadmin") {
    return { error: NextResponse.json({ error: "Only a superadmin can manage team members." }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const { session, error } = await requireSuperadmin();
  if (error) return error;

  await connectDB();
  const admins = await Admin.find({ _id: { $ne: session.user.id } }).select("-passwordHash").sort({ createdAt: -1 });

  // Attach how many projects each sub-admin has actually created
  const withCounts = await Promise.all(
    admins.map(async (a) => {
      const projectCount = await Project.countDocuments({ createdBy: a._id });
      return { ...a.toObject(), projectCount };
    })
  );

  return NextResponse.json({ admins: withCounts });
}

export async function POST(req) {
  const { session, error } = await requireSuperadmin();
  if (error) return error;

  const body = await req.json();
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  await connectDB();
  const existing = await Admin.findOne({ email: body.email });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const role = body.role === "superadmin" ? "superadmin" : "admin";
  const isSuper = role === "superadmin";

  const passwordHash = await bcrypt.hash(body.password, 10);
  const admin = await Admin.create({
    name: body.name,
    email: body.email,
    passwordHash,
    role,
    createdBy: session.user.id,
    maxProjects: isSuper || body.maxProjects === "" || body.maxProjects === null || body.maxProjects === undefined ? null : Number(body.maxProjects),
    permissions: isSuper
      ? { canDeleteProjects: true, canManageParticipants: true, canManageTemplates: true }
      : {
          canDeleteProjects: body.permissions?.canDeleteProjects ?? true,
          canManageParticipants: body.permissions?.canManageParticipants ?? true,
          canManageTemplates: body.permissions?.canManageTemplates ?? true,
        },
  });

  await logActivity({
    admin: session.user.id,
    action: "created_team_member",
    details: `${admin.email} (${role === "superadmin" ? "Super Admin" : "Simple User"}, max projects: ${admin.maxProjects ?? "unlimited"})`,
  });

  const safeAdmin = admin.toObject();
  delete safeAdmin.passwordHash;
  return NextResponse.json({ admin: safeAdmin }, { status: 201 });
}
