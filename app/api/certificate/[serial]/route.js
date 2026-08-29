import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Participant from "@/models/Participant";
import Project from "@/models/Project";
import { buildCertificateSVG, svgToPngBuffer } from "@/lib/certificate";
import { cacheGet, cacheSet } from "@/lib/cache";
import { isRateLimited, getClientKey } from "@/lib/rateLimit";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawSerial = resolvedParams?.serial || "";
    const serial = decodeURIComponent(rawSerial).trim();

    if (!serial) {
      return NextResponse.json({ error: "Serial number is required." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    // Default format for downloads is HD PNG (png), format=svg is for inline preview
    const format = (searchParams.get("format") || "svg").toLowerCase();

    // Public, unauthenticated endpoint — rate-limited
    if (isRateLimited(`cert:${getClientKey(req)}`, 120)) {
      return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429 });
    }

    await connectDB();
    
    // Case-insensitive lookup with regex escaping
    const safeRegex = new RegExp(`^${serial.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
    let participant = await Participant.findOne({ serialNumber: safeRegex });
    
    if (!participant) {
      participant = await Participant.findOne({ serialNumber: serial });
    }

    if (!participant) {
      return NextResponse.json({ error: "Certificate not found for this serial number." }, { status: 404 });
    }

    const project = await Project.findById(participant.project);
    if (!project) {
      return NextResponse.json({ error: "Associated project not found." }, { status: 404 });
    }

    // Update status to issued if it was pending
    if (participant.status === "pending" || participant.status === "generated") {
      try {
        await Participant.updateOne({ _id: participant._id }, { status: "issued" });
        participant.status = "issued";
      } catch (e) {
        console.warn("Could not update participant status:", e);
      }
    }

    // Determine verification URL
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl?.host || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      baseUrl = `${proto}://${host}`;
    }
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${encodeURIComponent(participant.serialNumber)}`;

    const cacheKey = `svg:${participant.serialNumber}:${participant.updatedAt?.getTime() || 0}:${project.updatedAt?.getTime() || 0}`;
    let svg = cacheGet(cacheKey);
    if (!svg) {
      svg = await buildCertificateSVG({ project, participant, verifyUrl });
      if (svg) {
        cacheSet(cacheKey, svg);
      }
    }

    if (!svg) {
      throw new Error("Failed to generate certificate SVG markup.");
    }

    const serialClean = participant.serialNumber || serial;

    // --- HD PNG Download (Default for certificate downloads) ---
    if (format === "png" || format === "download") {
      const pngCacheKey = `png:${participant.serialNumber}:${participant.updatedAt?.getTime() || 0}:${project.updatedAt?.getTime() || 0}`;
      let pngBuffer = cacheGet(pngCacheKey);
      if (!pngBuffer) {
        pngBuffer = await svgToPngBuffer(svg, project.templateWidth || 1000, project.templateHeight || 700);
        if (pngBuffer) {
          cacheSet(pngCacheKey, pngBuffer);
        }
      }

      const filename = `${serialClean}.png`;

      return new Response(pngBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}"; filename*="UTF-8''${encodeURIComponent(filename)}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Vary": "Accept, Accept-Encoding",
        },
      });
    }

    // --- SVG Download (Optional vector download) ---
    if (format === "svg-download") {
      const filename = `${serialClean}.svg`;
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"; filename*="UTF-8''${encodeURIComponent(filename)}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Vary": "Accept, Accept-Encoding",
        },
      });
    }

    // --- Inline SVG Preview (Default for <img> rendering) ---
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
        "Vary": "Accept, Accept-Encoding",
      },
    });
  } catch (err) {
    console.error("Certificate API Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error rendering certificate." },
      { status: 500 }
    );
  }
}
