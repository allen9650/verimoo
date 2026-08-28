import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import { formatDate } from "@/lib/dateFormat";
import * as XLSX from "xlsx";

export async function GET(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const participants = await Participant.find({ project: id }).sort({ createdAt: -1 }).lean();

  const rows = participants.map((p) => ({
    serialNumber: p.serialNumber,
    name: p.name,
    email: p.email || "",
    courseTitle: p.courseTitle || "",
    date: formatDate(p.date, project.dateFormat),
    status: p.status,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "_")}_participants.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
