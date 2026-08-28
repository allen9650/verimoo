import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import { sanitizeFontFamilyName } from "@/lib/sanitizeFontName";
import { safeFetch } from "@/lib/safeFetch";
import { logActivity } from "@/lib/log";

const MAX_CUSTOM_FONTS = 3;
const MAX_FONT_BYTES = 3 * 1024 * 1024; // 3MB

function canAccess(session, project) {
  return session.user.role === "superadmin" || String(project.createdBy) === session.user.id;
}

/**
 * Detects font mime type and CSS format by inspecting binary magic bytes,
 * with fallbacks to filename extension or supplied mime.
 */
function detectFontDetails(buffer, fallbackMime = "", fileName = "") {
  if (buffer && buffer.length >= 4) {
    const magic = buffer.subarray(0, 4).toString("latin1");
    // WOFF2: 'wOF2'
    if (magic === "wOF2") {
      return { mimeType: "font/woff2", format: "woff2" };
    }
    // WOFF: 'wOFF'
    if (magic === "wOFF") {
      return { mimeType: "font/woff", format: "woff" };
    }
    // OTF (OpenType with CFF): 'OTTO'
    if (magic === "OTTO") {
      return { mimeType: "font/otf", format: "opentype" };
    }
    // TTF (TrueType): 0x00010000 or 'true' or 'typ1'
    const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
    if ((b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00) || magic === "true" || magic === "typ1") {
      return { mimeType: "font/ttf", format: "truetype" };
    }
    // TrueType Collection: 'ttcf'
    if (magic === "ttcf") {
      return { mimeType: "font/ttf", format: "truetype" };
    }
  }

  // Fallback to filename extension
  const ext = (fileName || "").split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "woff2") return { mimeType: "font/woff2", format: "woff2" };
  if (ext === "woff") return { mimeType: "font/woff", format: "woff" };
  if (ext === "otf") return { mimeType: "font/otf", format: "opentype" };
  if (ext === "ttf") return { mimeType: "font/ttf", format: "truetype" };

  // Fallback to mime type string
  const m = (fallbackMime || "").toLowerCase();
  if (m.includes("woff2")) return { mimeType: "font/woff2", format: "woff2" };
  if (m.includes("woff")) return { mimeType: "font/woff", format: "woff" };
  if (m.includes("otf") || m.includes("opentype")) return { mimeType: "font/otf", format: "opentype" };
  if (m.includes("ttf") || m.includes("truetype")) return { mimeType: "font/ttf", format: "truetype" };

  return { mimeType: "font/ttf", format: "truetype" };
}

// Google Fonts (and similar) serve a CSS document containing one or more
// @font-face blocks, each with its own src: url(...) pointing at the actual
// font binary — not the font file itself. This extracts the best candidate
// font URL from that CSS, preferring woff2 > woff > ttf.
function extractFontUrlFromCss(css, baseUrl) {
  const matches = [...css.matchAll(/url\(([^)]+)\)\s*(?:format\(['"]?([^'"]+)['"]?\))?/gi)];
  if (matches.length === 0) {
    const bare = css.match(/url\(([^)]+)\)/i);
    if (!bare) return null;
    return new URL(bare[1].replace(/['"]/g, "").trim(), baseUrl).toString();
  }

  const byFormat = (fmt) => matches.find((m) => m[2] && m[2].toLowerCase().includes(fmt));
  const best = byFormat("woff2") || byFormat("woff") || byFormat("truetype") || byFormat("opentype") || matches[0];
  const rawUrl = best[1].replace(/['"]/g, "").trim();
  return new URL(rawUrl, baseUrl).toString();
}

export async function POST(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canAccess(session, project)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (project.customFonts.length >= MAX_CUSTOM_FONTS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_CUSTOM_FONTS} custom fonts per project. Remove one to add another.` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const label = String(body.name || "Custom Font").trim().slice(0, 60);

  let buffer;
  let rawMime = "";
  let originName = body.fileName || label;

  if (body.sourceUrl) {
    // --- Embed by link (Google Fonts URL, CSS URL, or direct font URL) ---
    let fetched;
    try {
      fetched = await safeFetch(body.sourceUrl);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const cType = (fetched.contentType || "").toLowerCase();
    if (cType.includes("css") || cType.includes("text") || body.sourceUrl.includes("fonts.googleapis.com")) {
      // CSS stylesheet link — extract the actual font file URL
      const fontUrl = extractFontUrlFromCss(fetched.buffer.toString("utf8"), body.sourceUrl);
      if (!fontUrl) {
        return NextResponse.json({ error: "Couldn't find a valid font file in that URL's CSS." }, { status: 400 });
      }
      try {
        fetched = await safeFetch(fontUrl);
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      originName = fontUrl;
      rawMime = fetched.contentType.split(";")[0].trim();
    } else {
      originName = body.sourceUrl;
      rawMime = cType.split(";")[0].trim();
    }
    buffer = fetched.buffer;
  } else if (body.dataUrl) {
    // --- Direct upload (data URI or base64 from browser FileReader) ---
    const dataStr = String(body.dataUrl).trim();
    if (dataStr.startsWith("data:")) {
      const commaIndex = dataStr.indexOf(",");
      if (commaIndex === -1) {
        return NextResponse.json({ error: "Invalid font file data format." }, { status: 400 });
      }
      const meta = dataStr.slice(5, commaIndex); // e.g. "font/woff2;base64" or ";base64"
      const base64Data = dataStr.slice(commaIndex + 1);
      const mimeMatch = meta.match(/^([^;]*)/);
      rawMime = mimeMatch ? mimeMatch[1].trim() : "";
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.from(dataStr, "base64");
    }
  } else {
    return NextResponse.json({ error: "Provide either a font file or a font URL to embed." }, { status: 400 });
  }

  if (!buffer || buffer.length === 0) {
    return NextResponse.json({ error: "The font file appears to be empty." }, { status: 400 });
  }

  if (buffer.length > MAX_FONT_BYTES) {
    return NextResponse.json({ error: "That font file is too large (max 3MB)." }, { status: 400 });
  }

  // Detect genuine font format from binary magic bytes (with extension fallback)
  const { mimeType: finalMimeType } = detectFontDetails(buffer, rawMime, originName);

  const existingNames = project.customFonts.map((f) => f.name);
  const familyName = sanitizeFontFamilyName(label, existingNames);
  const dataUrl = `data:${finalMimeType};base64,${buffer.toString("base64")}`;

  project.customFonts.push({ name: familyName, data: dataUrl, mimeType: finalMimeType });
  await project.save();
  await logActivity({ project: project._id, admin: session.user.id, action: "added_custom_font", details: familyName });

  return NextResponse.json({ customFonts: project.customFonts }, { status: 201 });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canAccess(session, project)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fontName = searchParams.get("name");
  project.customFonts = project.customFonts.filter((f) => f.name !== fontName);
  await project.save();

  return NextResponse.json({ customFonts: project.customFonts });
}
