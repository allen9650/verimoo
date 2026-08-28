import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import TextTemplate from "@/models/TextTemplate";

export async function DELETE(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const template = await TextTemplate.findById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Anyone can use a shared template, but only its creator or a superadmin
  // can remove it.
  if (session.user.role !== "superadmin" && String(template.createdBy) !== session.user.id) {
    return NextResponse.json({ error: "Only the creator or a superadmin can delete this template." }, { status: 403 });
  }

  await TextTemplate.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
