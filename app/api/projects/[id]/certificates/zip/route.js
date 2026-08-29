import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZipArchive } from "archiver";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import { buildCertificateSVG, svgToPngBuffer } from "@/lib/certificate";
import { logActivity } from "@/lib/log";

// Builds a ZIP of every participant's certificate for a project and returns
// it as a single buffered response. Fine for the batch sizes a typical
// workshop/training project has (tens to low hundreds of certificates); for
// very large projects you'd want to switch this to a true streamed response
// instead of collecting the whole archive in memory first.
//
// Bulk downloads are always high-resolution PNG (rendered directly from the
// certificate's own SVG at 300 DPI — see lib/certificate.js — never a
// screenshot or DOM capture), one PNG per participant, at whatever paper
// size the project has selected. There's no PDF option anywhere in this
// app; single-certificate downloads are SVG (see
// app/api/certificate/[serial]/route.js), and bulk is PNG.
export async function GET(req, { params }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const participants = await Participant.find({ project: id }).sort({ name: 1 });
  if (participants.length === 0) {
    return NextResponse.json({ error: "This project has no participants yet." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks = [];
  archive.on("data", (chunk) => chunks.push(chunk));
  const archiveClosed = new Promise((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  for (const participant of participants) {
    const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(participant.serialNumber)}`;
    const svg = await buildCertificateSVG({ project, participant, verifyUrl });
    const safeName = participant.serialNumber.replace(/[^a-z0-9_-]+/gi, "_");
    try {
      const pngBuffer = await svgToPngBuffer(svg, project.templateWidth, project.templateHeight);
      if (pngBuffer && pngBuffer.length > 0) {
        archive.append(pngBuffer, { name: `${safeName}.png` });
      } else {
        archive.append(Buffer.from(svg), { name: `${safeName}.svg` });
      }
    } catch {
      archive.append(Buffer.from(svg), { name: `${safeName}.svg` });
    }
  }

  archive.finalize();
  await archiveClosed;

  // Mark all pending or generated participants in this project as issued
  await Participant.updateMany(
    { project: id, status: { $in: ["pending", "generated"] } },
    { status: "issued" }
  );

  const zipBuffer = Buffer.concat(chunks);
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "_")}_certificates.zip`;

  await logActivity({
    project: project._id,
    admin: session.user.id,
    action: "bulk_downloaded_certificates",
    details: `${participants.length} certificates (PNG, 300 DPI)`,
  });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
