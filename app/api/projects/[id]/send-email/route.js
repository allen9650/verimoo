import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import { buildCertificateSVG, svgToPngBuffer } from "@/lib/certificate";
import { decryptSecret } from "@/lib/crypto";
import { logActivity } from "@/lib/log";

function canAccess(session, project) {
  return session.user.role === "superadmin" || String(project.createdBy) === session.user.id;
}

export async function POST(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canAccess(session, project)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!project.settings?.emailSending || !project.emailConfig?.enabled) {
    return NextResponse.json({ error: "Email sending isn't enabled for this project." }, { status: 400 });
  }
  if (!project.emailConfig.gmailAddress || !project.emailConfig.gmailAppPasswordEncrypted) {
    return NextResponse.json({ error: "Add a Gmail address and app password in Project Settings first." }, { status: 400 });
  }

  const body = await req.json();
  const participantIds = Array.isArray(body.participantIds) ? body.participantIds : null;
  const filter = participantIds ? { _id: { $in: participantIds }, project: id } : { project: id };
  const participants = await Participant.find(filter).where("email").ne("").ne(null);

  if (participants.length === 0) {
    return NextResponse.json({ error: "No participants with an email address to send to." }, { status: 400 });
  }

  let gmailAppPassword;
  try {
    gmailAppPassword = decryptSecret(project.emailConfig.gmailAppPasswordEncrypted);
  } catch {
    return NextResponse.json({ error: "Couldn't decrypt the stored Gmail app password — re-enter it in Settings." }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: project.emailConfig.gmailAddress, pass: gmailAppPassword },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const sent = [];
  const failed = [];

  for (const participant of participants) {
    try {
      const verifyUrl = `${baseUrl}/verify/${participant.serialNumber}`;
      const svg = await buildCertificateSVG({ project, participant, verifyUrl });
      const pngBuffer = await svgToPngBuffer(svg, project.templateWidth, project.templateHeight);

      await transporter.sendMail({
        from: `"${project.organizationName || project.name}" <${project.emailConfig.gmailAddress}>`,
        to: participant.email,
        subject: `Your certificate — ${project.name}`,
        text: `Hi ${participant.name},\n\nYour certificate for ${project.name} is attached. You can verify it any time at ${verifyUrl}\n\nSerial: ${participant.serialNumber}`,
        attachments: [{ filename: `${participant.serialNumber}.png`, content: pngBuffer }],
      });

      participant.status = "emailed";
      participant.emailedAt = new Date();
      await participant.save();
      sent.push(participant.serialNumber);
    } catch (e) {
      failed.push({ serialNumber: participant.serialNumber, reason: e.message });
    }
  }

  await logActivity({
    project: project._id,
    admin: session.user.id,
    action: "sent_certificate_emails",
    details: `${sent.length} sent, ${failed.length} failed`,
  });

  return NextResponse.json({ sentCount: sent.length, failed });
}
