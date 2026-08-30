import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { formatDate } from "./dateFormat.js";
import { sanitizeSvg } from "./sanitizeSvg.js";
import { pngToPdfBuffer } from "./pdf.js";

// Lazy-loaded Resvg instance (self-contained Rust SVG rasterizer)
let resvgModule = null;
let resvgChecked = false;

async function getResvg() {
  if (resvgChecked) return resvgModule;
  resvgChecked = true;
  try {
    const mod = await import("@resvg/resvg-js");
    resvgModule = mod.Resvg || mod.default?.Resvg || mod.default;
  } catch (e) {
    console.warn("@resvg/resvg-js is unavailable in this environment:", e?.message || e);
    resvgModule = null;
  }
  return resvgModule;
}

// Lazy-loaded native Sharp instance
let sharpModule = null;
let sharpChecked = false;

async function getSharp() {
  if (sharpChecked) return sharpModule;
  sharpChecked = true;
  try {
    const mod = await import("sharp");
    sharpModule = mod.default || mod;
  } catch (e) {
    console.warn("Sharp native module unavailable in this environment:", e?.message || e);
    sharpModule = null;
  }
  return sharpModule;
}

// Escapes text for safe SVG embedding
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Embedded fallback font -------------------------------------------------
let cachedFontStyleBlock;
function getFontStyleBlock() {
  if (cachedFontStyleBlock) return cachedFontStyleBlock;
  try {
    const candidates = [
      path.join(process.cwd(), "assets/fonts"),
      path.join(process.cwd(), "public/fonts"),
    ];

    let dir = null;
    for (const cand of candidates) {
      try {
        if (fs.existsSync(path.join(cand, "inter-regular.woff"))) {
          dir = cand;
          break;
        }
      } catch {
        // continue
      }
    }

    if (dir) {
      const regular = fs.readFileSync(path.join(dir, "inter-regular.woff")).toString("base64");
      const bold = fs.readFileSync(path.join(dir, "inter-bold.woff")).toString("base64");
      cachedFontStyleBlock = `<style>
        @font-face { font-family: 'VeriMooEmbedded'; font-weight: 400; src: url(data:font/woff;base64,${regular}) format('woff'); }
        @font-face { font-family: 'VeriMooEmbedded'; font-weight: 700; src: url(data:font/woff;base64,${bold}) format('woff'); }
      </style>`;
      return cachedFontStyleBlock;
    }
  } catch (err) {
    console.warn("Could not load embedded font files for SVG:", err);
  }

  // Fallback to web font import if local binary not read
  cachedFontStyleBlock = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');
  </style>`;
  return cachedFontStyleBlock;
}

function fontFormatFromMime(mimeType = "") {
  if (mimeType.includes("woff2")) return "woff2";
  if (mimeType.includes("woff")) return "woff";
  if (mimeType.includes("otf") || mimeType.includes("opentype")) return "opentype";
  return "truetype";
}

function getCustomFontStyleBlock(project) {
  if (!project?.customFonts?.length) return "";

  // Only embed custom fonts that are actually referenced in project fields
  const usedFontNames = new Set(
    (project.fields || [])
      .map((f) => (f.fontFamily || "").toLowerCase())
      .filter(Boolean)
  );

  const activeFonts = project.customFonts.filter((f) => {
    const fontNameLower = (f.name || "").toLowerCase();
    return usedFontNames.size === 0 || Array.from(usedFontNames).some((name) => name.includes(fontNameLower));
  });

  if (activeFonts.length === 0) return "";

  const rules = activeFonts
    .map(
      (f) =>
        `@font-face { font-family: '${esc(f.name)}'; src: url('${f.data}') format('${fontFormatFromMime(f.mimeType)}'); font-display: swap; }`
    )
    .join("\n");
  return `<style>${rules}</style>`;
}

const VALUE_RESOLVERS = {
  participantName: (p) => p?.name,
  serialNumber: (p) => p?.serialNumber,
  courseTitle: (p) => p?.courseTitle,
  date: (p, project) => formatDate(p?.date, project?.dateFormat),
  orgName: (p, project) => project?.organizationName,
};

function getCustomFieldValue(customFields, key) {
  if (!customFields) return "";
  if (typeof customFields.get === "function") return customFields.get(key) || "";
  return customFields[key] || "";
}

function resolveValue(field, participant, project) {
  if (field.key === "static") return field.content || "";
  if (VALUE_RESOLVERS[field.key]) return VALUE_RESOLVERS[field.key](participant, project) || "";
  return getCustomFieldValue(participant?.customFields, field.key);
}

function textFieldSvg(field, x, y, value) {
  const anchor = field.align === "left" ? "start" : field.align === "right" ? "end" : "middle";
  const letterSpacing = field.letterSpacing ? ` letter-spacing="${field.letterSpacing}"` : "";
  const fontFamily = `${field.fontFamily || "Helvetica, Arial, sans-serif"}, VeriMooEmbedded, sans-serif`;
  return `<text x="${x}" y="${y}" font-size="${field.fontSize}" font-family="${esc(
    fontFamily
  )}" fill="${field.color || "#000000"}" text-anchor="${anchor}" dominant-baseline="middle"${letterSpacing} font-weight="${field.bold ? "bold" : "normal"}" font-style="${field.italic ? "italic" : "normal"}" text-decoration="${field.underline ? "underline" : "none"}">${esc(value)}</text>`;
}

/**
 * Builds the final certificate SVG markup by layering dynamic fields
 * (text, QR code, logo) on top of the project's uploaded template.
 * 100% pure JavaScript execution with zero native binary requirement.
 */
export async function buildCertificateSVG({ project, participant, verifyUrl }) {
  const width = project?.templateWidth || 1000;
  const height = project?.templateHeight || 700;

  let background = "";
  if (project?.templateImage?.data) {
    let imgData = project.templateImage.data;

    // If sharp is available and image is oversized, optimize it
    if (imgData.length > 500_000) {
      try {
        const sharpInstance = await getSharp();
        if (sharpInstance) {
          const base64Data = imgData.replace(/^data:image\/[a-z]+;base64,/, "");
          const rawBuf = Buffer.from(base64Data, "base64");
          if (rawBuf.length > 300_000) {
            const maxDim = 2000;
            const compressed = await sharpInstance(rawBuf)
              .resize(Math.min(maxDim, width * 2), Math.min(maxDim, height * 2), { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 86, progressive: true })
              .toBuffer();
            imgData = `data:image/jpeg;base64,${compressed.toString("base64")}`;
          }
        }
      } catch (err) {
        console.warn("Could not optimize template raster image, using original:", err);
      }
    }

    background = `<image x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" href="${imgData}" xlink:href="${imgData}" />`;
  } else if (project?.templateSvg) {
    const inner = sanitizeSvg(project.templateSvg)
      .replace(/^[\s\S]*?<svg[^>]*>/i, "")
      .replace(/<\/svg>\s*$/i, "");
    background = inner;
  } else {
    background = `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>`;
  }

  // QR & logo overlays
  const overlays = await Promise.all(
    (project?.fields || []).map(async (field) => {
      const x = (field.x / 100) * width;
      const y = (field.y / 100) * height;

      if (field.type === "qr") {
        if (project.settings?.qrCode === false) return "";
        const size = field.size || 120;
        let qrDataUrl = "";
        try {
          qrDataUrl = await QRCode.toDataURL(verifyUrl || "https://verimoo.com", {
            margin: 1,
            width: size,
            errorCorrectionLevel: "M",
          });
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
        if (!qrDataUrl) return "";
        return `<image x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" href="${qrDataUrl}" xlink:href="${qrDataUrl}" />`;
      }

      if (field.type === "image" && field.key === "logo") {
        const logoUrl = project.branding?.logoUrl;
        if (!logoUrl) return "";
        const size = field.size || 100;
        return `<image x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="${logoUrl}" xlink:href="${logoUrl}" />`;
      }

      if (field.type === "text") {
        return textFieldSvg(field, x, y, resolveValue(field, participant, project));
      }

      return "";
    })
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${getFontStyleBlock()}${getCustomFontStyleBlock(project)}${background}${overlays.join(
    ""
  )}</svg>`;
}

const TARGET_DPI = 300;
const AUTHORING_DPI = 96;

/**
 * Converts certificate SVG into crisp 300 DPI high-definition PNG buffer.
 * Uses @resvg/resvg-js (Rust engine) as primary, with Sharp fallback.
 */
export async function svgToPngBuffer(svgString, width = 1000, height = 700) {
  const scale = TARGET_DPI / AUTHORING_DPI;
  const targetWidth = Math.max(100, Math.round(width * scale));

  // 1. Primary: Resvg (Self-contained Rust native binary, no external libvips dependency)
  try {
    const ResvgClass = await getResvg();
    if (ResvgClass) {
      const resvg = new ResvgClass(svgString, {
        fitTo: { mode: "width", value: targetWidth },
        font: { loadSystemFonts: true },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      if (pngBuffer && pngBuffer.length > 0) {
        return Buffer.from(pngBuffer);
      }
    }
  } catch (resvgErr) {
    console.warn("Resvg primary rasterization notice:", resvgErr?.message || resvgErr);
  }

  // 2. Secondary: Sharp fallback
  try {
    const sharpInstance = await getSharp();
    if (sharpInstance) {
      const targetHeight = Math.max(100, Math.round(height * scale));
      let scaledSvg = svgString;
      if (/^<svg[^>]*\swidth="/i.test(scaledSvg)) {
        scaledSvg = scaledSvg.replace(
          /^(<svg[^>]*\swidth=")[^"]*("\sheight=")[^"]*(")/i,
          `$1${targetWidth}$2${targetHeight}$3`
        );
      }
      return await sharpInstance(Buffer.from(scaledSvg), { density: 300 })
        .resize(targetWidth, targetHeight, { fit: "fill" })
        .png({ quality: 100, compressionLevel: 6 })
        .toBuffer();
    }
  } catch (sharpErr) {
    console.warn("Sharp fallback notice:", sharpErr?.message || sharpErr);
  }

  return null;
}

/**
 * Generates a standard PDF document buffer from SVG & PNG pipeline
 * Returns null gracefully if server-side PNG rendering is unavailable
 */
export async function generateCertificatePdf(svgString, width = 1000, height = 700, title = "Certificate of Verification") {
  const pngBuffer = await svgToPngBuffer(svgString, width, height);
  if (!pngBuffer) {
    return null;
  }
  return await pngToPdfBuffer(pngBuffer, width, height, title);
}

export function generateSerial(prefix, counter) {
  const padded = String(counter).padStart(5, "0");
  return `${prefix}-${padded}`;
}
