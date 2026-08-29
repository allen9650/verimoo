import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Participant from "@/models/Participant";
import Project from "@/models/Project";
import { buildCertificateSVG, svgToPngBuffer, generateCertificatePdf } from "@/lib/certificate";
import { cacheGet, cacheSet } from "@/lib/cache";
import { isRateLimited, getClientKey } from "@/lib/rateLimit";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawSerial = resolvedParams?.serial || "";
    let serial = decodeURIComponent(rawSerial).trim();
    try {
      if (serial.includes("%")) {
        serial = decodeURIComponent(serial).trim();
      }
    } catch {}

    const { searchParams } = new URL(req.url);
    if (!serial) {
      serial = (searchParams.get("serial") || searchParams.get("s") || "").trim();
    }

    if (!serial) {
      return NextResponse.json({ error: "Serial number is required." }, { status: 400 });
    }

    // Default format for downloads is PNG. Supported options: png, pdf, svg (for web preview)
    const format = (searchParams.get("format") || "svg").toLowerCase();

    // Public, unauthenticated endpoint rate limit
    if (isRateLimited(`cert:${getClientKey(req)}`, 180)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    await connectDB();

    // Case-insensitive lookup with regex escaping
    const safeRegex = new RegExp(`^${serial.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
    let participant = await Participant.findOne({ serialNumber: safeRegex });

    if (!participant) {
      participant = await Participant.findOne({ serialNumber: serial });
    }

    // Strict 404 validation: verify certificate exists before generation
    if (!participant) {
      return NextResponse.json(
        { error: "Certificate not found for this serial number." },
        { status: 404 }
      );
    }

    const project = await Project.findById(participant.project);
    if (!project) {
      return NextResponse.json(
        { error: "Associated project not found." },
        { status: 404 }
      );
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

    const pTime = participant.updatedAt?.getTime() || 0;
    const prjTime = project.updatedAt?.getTime() || 0;
    const baseCacheKey = `${participant.serialNumber}:${pTime}:${prjTime}`;

    // 1. Build or retrieve SVG
    const svgCacheKey = `svg:${baseCacheKey}`;
    let svg = cacheGet(svgCacheKey);
    if (!svg) {
      svg = await buildCertificateSVG({ project, participant, verifyUrl });
      if (svg) {
        cacheSet(svgCacheKey, svg);
      }
    }

    if (!svg) {
      return NextResponse.json(
        { error: "Failed to generate certificate vector markup." },
        { status: 500 }
      );
    }

    const serialClean = participant.serialNumber || serial;
    const width = project.templateWidth || 1000;
    const height = project.templateHeight || 700;

    // --- 1. PDF Download (`format=pdf`) ---
    if (format === "pdf") {
      const pdfCacheKey = `pdf:${baseCacheKey}`;
      let pdfBuffer = cacheGet(pdfCacheKey);
      if (!pdfBuffer) {
        try {
          pdfBuffer = await generateCertificatePdf(svg, width, height, `Certificate — ${participant.name}`);
          if (pdfBuffer) {
            cacheSet(pdfCacheKey, pdfBuffer);
          }
        } catch (pdfErr) {
          console.error("PDF generation error:", pdfErr);
        }
      }

      if (!pdfBuffer) {
        return NextResponse.json(
          { error: "Failed to compile PDF document." },
          { status: 500 }
        );
      }

      const filename = `${serialClean}.pdf`;
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"; filename*="UTF-8''${encodeURIComponent(filename)}"`,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // --- 2. PNG Download (`format=png` or `format=download`) ---
    if (format === "png" || format === "download") {
      const pngCacheKey = `png:${baseCacheKey}`;
      let pngBuffer = cacheGet(pngCacheKey);
      if (!pngBuffer) {
        try {
          pngBuffer = await svgToPngBuffer(svg, width, height);
          if (pngBuffer) {
            cacheSet(pngCacheKey, pngBuffer);
          }
        } catch (rasterErr) {
          console.error("PNG rasterization error:", rasterErr);
        }
      }

      if (!pngBuffer) {
        return NextResponse.json(
          { error: "Failed to generate PNG image." },
          { status: 500 }
        );
      }

      const filename = `${serialClean}.png`;
      return new Response(pngBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}"; filename*="UTF-8''${encodeURIComponent(filename)}"`,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // --- 3. Inline SVG Preview for Web UI (`format=svg`) ---
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
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
