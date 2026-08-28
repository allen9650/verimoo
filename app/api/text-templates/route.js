import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import TextTemplate from "@/models/TextTemplate";

// Shared across all projects/admins so a wording block created once (e.g.
// "Certificate of Excellence") can be reused anywhere with one click.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const templates = await TextTemplate.find().sort({ createdAt: -1 });
  return NextResponse.json({ templates });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.label || !body.content) {
    return NextResponse.json({ error: "Label and content are required." }, { status: 400 });
  }
  await connectDB();
  const template = await TextTemplate.create({
    label: body.label,
    content: body.content,
    createdBy: session.user.id,
  });
  return NextResponse.json({ template }, { status: 201 });
}
