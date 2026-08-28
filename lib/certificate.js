import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { formatDate } from "./dateFormat.js";
import { sanitizeSvg } from "./sanitizeSvg.js";

// Escapes text for safe SVG embedding
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Embedded fallback font -------------------------------------------------
//
// Real bug this fixes: text could render fine in a browser (viewing the
// inline `format=svg` output) but come out completely blank in the
// rasterized (PNG) output. Root cause: rasterization happens server-side via
// sharp (librsvg), which — unlike a browser — depends entirely on fonts
// installed on the *server's OS*. Many deployment targets (serverless
// platforms like Vercel most notably, but also minimal Docker images) ship
// with zero system fonts, so librsvg silently draws nothing for any <text>
// element while shapes/QR codes/images (which don't need fonts) render
// normally — exactly the "titles/names missing, everything else fine"
// symptom.
//
// The fix: embed a real, redistributable font (Inter, SIL OFL-1.1 license)
// directly into the SVG as a `@font-face { src: url(data:...) }` rule, and
// reference it as a guaranteed fallback on every text element. This makes
// text rendering work identically on any host, regardless of what fonts (if
// any) are installed there — verified with a standalone script asserting
// text pixels are actually drawn using a font name that cannot possibly
// match any installed system font, proving the embedded data (not a system
// fallback) was used.
let cachedFontStyleBlock;
function getFontStyleBlock() {
  if (cachedFontStyleBlock) return cachedFontStyleBlock;
  try {
    // Bundled directly in this repo (assets/fonts/), NOT read from
    // node_modules — deployment platforms that trace which files a
    // serverless function needs (Vercel's @vercel/nft, Next.js
    // `output: "standalone"`) can miss dynamic fs.readFileSync calls into
    // node_modules, which would silently reintroduce this exact bug in
    // production even though it works locally. Files under the project's
    // own source tree don't have that problem.
    const dir = path.join(process.cwd(), "assets/fonts");
    const regular = fs.readFileSync(path.join(dir, "inter-regular.woff")).toString("base64");
    const bold = fs.readFileSync(path.join(dir, "inter-bold.woff")).toString("base64");
    cachedFontStyleBlock = `<style>
      @font-face { font-family: 'VeriMooEmbedded'; font-weight: 400; src: url(data:font/woff;base64,${regular}) format('woff'); }
      @font-face { font-family: 'VeriMooEmbedded'; font-weight: 700; src: url(data:font/woff;base64,${bold}) format('woff'); }
    </style>`;
  } catch {
    // If the font files aren't present for some reason, fall back to no
    // embedded style block rather than failing certificate generation
    // entirely — text will then depend on the server's installed fonts, same
    // as before this fix.
    cachedFontStyleBlock = "";
  }
  return cachedFontStyleBlock;
}

function fontFormatFromMime(mimeType = "") {
  if (mimeType.includes("woff2")) return "woff2";
  if (mimeType.includes("woff")) return "woff";
  if (mimeType.includes("otf") || mimeType.includes("opentype")) return "opentype";
  return "truetype";
}

// Renders @font-face rules for a project's own uploaded/embedded-by-link
// fonts (up to 3, see app/api/projects/[id]/fonts/route.js), on top of the
// always-present Inter fallback from getFontStyleBlock(). Each font's name
// is already sanitized to a safe CSS identifier at upload time
// (lib/sanitizeFontName.js) — re-escaped here too as defense in depth.
function getCustomFontStyleBlock(project) {
  if (!project.customFonts?.length) return "";
  const rules = project.customFonts
    .map(
      (f) =>
        `@font-face { font-family: '${esc(f.name)}'; src: url('${f.data}') format('${fontFormatFromMime(f.mimeType)}'); font-display: swap; }`
    )
    .join("\n");
  return `<style>${rules}</style>`;
}

const VALUE_RESOLVERS = {
  participantName: (p) => p.name,
  serialNumber: (p) => p.serialNumber,
  courseTitle: (p) => p.courseTitle,
  date: (p, project) => formatDate(p.date, project.dateFormat),
  orgName: (p, project) => project.organizationName,
};

function getCustomFieldValue(customFields, key) {
  if (!customFields) return "";
  // Mongoose documents expose a real Map (supports .get); plain objects
  // (e.g. after JSON serialization) fall back to bracket access.
  if (typeof customFields.get === "function") return customFields.get(key) || "";
  return customFields[key] || "";
}

function resolveValue(field, participant, project) {
  if (field.key === "static") return field.content || "";
  if (VALUE_RESOLVERS[field.key]) return VALUE_RESOLVERS[field.key](participant, project) || "";
  return getCustomFieldValue(participant.customFields, field.key);
}

function textFieldSvg(field, x, y, value) {
  const anchor = field.align === "left" ? "start" : field.align === "right" ? "end" : "middle";
  // dominant-baseline="middle" makes the SVG vertically center text on `y`,
  // matching the editor preview's `translateY(-50%)` positioning — without
  // it, SVG anchors text at its baseline instead of its center, which is the
  // "location isn't synchronized" symptom (text rendering visibly lower than
  // where it was dragged in the preview).
  //
  // The chosen font-family is always followed by 'VeriMooEmbedded' as a
  // guaranteed-available fallback (see getFontStyleBlock above), so text
  // still renders even if none of the user's preferred fonts are installed
  // on the server.
  const letterSpacing = field.letterSpacing ? ` letter-spacing="${field.letterSpacing}"` : "";
  const fontFamily = `${field.fontFamily || "Helvetica, Arial, sans-serif"}, VeriMooEmbedded, sans-serif`;
  return `<text x="${x}" y="${y}" font-size="${field.fontSize}" font-family="${esc(
    fontFamily
  )}" fill="${field.color}" text-anchor="${anchor}" dominant-baseline="middle"${letterSpacing} font-weight="${field.bold ? "bold" : "normal"}" font-style="${field.italic ? "italic" : "normal"}" text-decoration="${field.underline ? "underline" : "none"}">${esc(value)}</text>`;
}

/**
 * Builds the final certificate SVG markup by layering dynamic fields
 * (text, QR code, logo) on top of the project's uploaded template.
 *
 * The template background always renders at the project's *current*
 * templateWidth/templateHeight, so changing the paper size later re-fits
 * the background instead of leaving it baked in at old dimensions.
 */
export async function buildCertificateSVG({ project, participant, verifyUrl }) {
  const width = project.templateWidth || 1000;
  const height = project.templateHeight || 700;

  let background;
  if (project.templateImage?.data) {
    // Raster (png/jpg/etc) templates are stretched to fill the current
    // paper size exactly, so the background always matches the live preview
    // and the chosen paper size — even if the size was changed after upload.
    background = `<image x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" href="${project.templateImage.data}" />`;
  } else if (project.templateSvg) {
    // Strip the outer <svg> wrapper from the uploaded vector template so we
    // can re-wrap it with our own current width/height/viewBox. Sanitized
    // again here defensively (it's also sanitized at upload time) in case
    // any pre-sanitization data is still in the database from before that
    // check existed.
    const inner = sanitizeSvg(project.templateSvg)
      .replace(/^[\s\S]*?<svg[^>]*>/i, "")
      .replace(/<\/svg>\s*$/i, "");
    background = inner;
  } else {
    background = `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>`;
  }

  // QR generation is the only per-field async work; resolving all fields in
  // parallel (rather than one at a time in a for-loop) matters once a
  // template has more than one QR/async field.
  const overlays = await Promise.all(
    (project.fields || []).map(async (field) => {
      const x = (field.x / 100) * width;
      const y = (field.y / 100) * height;

      if (field.type === "qr") {
        if (project.settings?.qrCode === false) return "";
        const size = field.size || 120;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: size });
        return `<image x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" href="${qrDataUrl}" />`;
      }
      if (field.type === "image" && field.key === "logo") {
        const logoUrl = project.branding?.logoUrl;
        if (!logoUrl) return "";
        const size = field.size || 100;
        // preserveAspectRatio="xMidYMid meet" (not "none") keeps the logo's
        // own proportions — critical for transparent PNG logos, which would
        // otherwise look squashed/stretched against their alpha channel.
        return `<image x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="${logoUrl}" />`;
      }
      if (field.type === "text") {
        return textFieldSvg(field, x, y, resolveValue(field, participant, project));
      }
      return "";
    })
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${getFontStyleBlock()}${getCustomFontStyleBlock(project)}${background}${overlays.join(
    ""
  )}</svg>`;
}

// Renders the certificate straight from its SVG at true 300 DPI — no PDF
// step at all. Our paper-size presets (and any custom size) are authored in
// 96-DPI-style "px" units, so scaling the outer <svg> width/height by
// exactly 300/96 (while leaving viewBox untouched) makes librsvg re-render
// every vector element — text, QR modules, embedded logos — at precisely
// 300 pixels per inch of the selected page size, rather than upscaling a
// blurry raster or approximating the ratio. This is the single source of
// truth for both the bulk ZIP export and certificate email attachments.
const TARGET_DPI = 300;
const AUTHORING_DPI = 96; // the DPI our paper-size presets (A4/Letter/etc.) are authored at

export async function svgToPngBuffer(svgString, width, height) {
  const scale = TARGET_DPI / AUTHORING_DPI;
  const scaledSvg = svgString.replace(
    /^(<svg[^>]*\swidth=")[^"]*("\sheight=")[^"]*(")/,
    `$1${Math.round(width * scale)}$2${Math.round(height * scale)}$3`
  );
  return sharp(Buffer.from(scaledSvg)).png().toBuffer();
}

export function generateSerial(prefix, counter) {
  const padded = String(counter).padStart(5, "0");
  return `${prefix}-${padded}`;
}
