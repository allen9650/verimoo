import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import { generateSerial } from "@/lib/certificate";
import { parseDateInputValue } from "@/lib/dateFormat";
import { logActivity } from "@/lib/log";

export async function POST(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await connectDB();

  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Manual serial numbers (e.g. "ABC-2026-001", "SCHOOL-1001") are used as-is;
  // otherwise one is auto-generated from the project's prefix/counter.
  let serialNumber = body.serialNumber?.trim();
  if (!serialNumber) {
    project.serialCounter += 1;
    serialNumber = generateSerial(project.serialPrefix, project.serialCounter);
    await project.save();
  }

  try {
    const participant = await Participant.create({
      project: project._id,
      serialNumber,
      name: body.name,
      email: body.email,
      courseTitle: body.courseTitle,
      date: parseDateInputValue(body.date),
      customFields: body.customFields || {},
    });
    await logActivity({ project: project._id, admin: session.user.id, action: "added_participant", details: participant.name });
    return NextResponse.json({ participant }, { status: 201 });
  } catch (e) {
    if (e.code === 11000) {
      return NextResponse.json({ error: `Serial number "${serialNumber}" is already in use.` }, { status: 409 });
    }
    throw e;
  }
}
