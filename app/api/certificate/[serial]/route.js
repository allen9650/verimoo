import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Participant from "@/models/Participant";
import Project from "@/models/Project";
import { buildCertificateSVG } from "@/lib/certificate";
import { cacheGet, cacheSet } from "@/lib/cache";
import { isRateLimited, getClientKey } from "@/lib/rateLimit";

// Single-certificate downloads are SVG only — fully vector, so it's an exact
// match for the live preview at whatever paper size/orientation is selected,
// with no rasterization step to introduce quality loss. (Bulk downloads use
// high-resolution PNG instead — see
// app/api/projects/[id]/certificates/zip/route.js — since a ZIP of many
// individually-viewable images is a better fit there than a folder of SVGs
// that some tools don't preview as thumbnails.)
export async function GET(req, { params }) {
  const { serial } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "svg";

  // Public, unauthenticated endpoint — rate-limited to prevent serial-number
  // enumeration and resource-exhaustion abuse.
  if (isRateLimited(`cert:${getClientKey(req)}`, 60)) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429 });
  }

  await connectDB();
  const participant = await Participant.findOne({ serialNumber: serial });
  if (!participant) {
    return NextResponse.json({ error: "Certificate not found for this serial number." }, { status: 404 });
  }
  const project = await Project.findById(participant.project);
  if (!project) {
    return NextResponse.json({ error: "Associated project not found." }, { status: 404 });
  }

  // Update status to issued if it was pending
  if (participant.status === "pending" || participant.status === "generated") {
    await Participant.updateOne({ _id: participant._id }, { status: "issued" });
    participant.status = "issued";
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const verifyUrl = `${baseUrl}/verify/${serial}`;

  // Cache key includes both documents' updatedAt, so any edit to the
  // participant or the project (template, fields, paper size, etc.)
  // automatically invalidates old cached output — no manual cache-busting
  // needed. This is what actually fixes slow/repeated-hang certificate
  // views: without it, every view re-fetches the full project document
  // (including any embedded base64 template image) and rebuilds the SVG
  // from scratch, every single time.
  const cacheKey = `svg:${serial}:${participant.updatedAt?.getTime()}:${project.updatedAt?.getTime()}`;
  let svg = cacheGet(cacheKey);
  if (!svg) {
    svg = await buildCertificateSVG({ project, participant, verifyUrl });
    cacheSet(cacheKey, svg);
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": format === "download" ? `attachment; filename="${serial}.svg"` : "inline",
      "Cache-Control": "private, max-age=600",
    },
  });
}
