import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Participant from "@/models/Participant";
import { logActivity } from "@/lib/log";

export async function PATCH(req, { params }) {
  const { id, pid } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await connectDB();
  const participant = await Participant.findOneAndUpdate(
    { _id: pid, project: id },
    body,
    { returnDocument: "after" }
  );
  await logActivity({ project: id, admin: session.user.id, action: "updated_participant", details: participant?.name });
  return NextResponse.json({ participant });
}

export async function DELETE(req, { params }) {
  const { id, pid } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await Participant.findOneAndDelete({ _id: pid, project: id });
  await logActivity({ project: id, admin: session.user.id, action: "deleted_participant" });
  return NextResponse.json({ ok: true });
}
