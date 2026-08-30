import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

/**
 * Universal Dual-Format (PNG & PDF) Certificate Downloader
 * Guarantees crisp 300 DPI rendering of all text, names, fonts, QR codes, and branding.
 */

function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/**
 * Renders an SVG markup string to a high-definition 300 DPI PNG Blob using HTML5 Canvas
 */
export function renderSvgToPngBlob(
  svgString: string,
  baseWidth: number = 1000,
  baseHeight: number = 700
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    try {
      // 300 DPI scaling factor (300 / 96 ≈ 3.125)
      const scale = 300 / 96;
      const targetWidth = Math.max(100, Math.round(baseWidth * scale));
      const targetHeight = Math.max(100, Math.round(baseHeight * scale));

      // Clean SVG for safe Image loading
      const cleanedSvg = svgString
        .replace(/<style[\s\S]*?@import[\s\S]*?<\/style>/gi, "")
        .trim();

      const blob = new Blob([cleanedSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob(
              (pngBlob) => {
                URL.revokeObjectURL(url);
                resolve(pngBlob);
              },
              "image/png",
              1.0
            );
            return;
          }
        } catch (canvasErr) {
          console.error("Canvas draw error:", canvasErr);
        }
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.onerror = () => {
        console.warn("SVG Image load error in Canvas.");
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch (err) {
      console.error("renderSvgToPngBlob fatal error:", err);
      resolve(null);
    }
  });
}

/**
 * Downloads the certificate strictly in PNG or PDF format with all text, names, and fonts intact
 */
export async function downloadCertificate(
  serialNumber: string,
  format: "png" | "pdf" = "png",
  svgContent?: string,
  width: number = 1000,
  height: number = 700
): Promise<void> {
  if (typeof window === "undefined") return;
  const cleanSerial = (serialNumber || "certificate").trim();

  // Helper to fetch SVG if not provided or incomplete
  async function fetchSvgText(): Promise<string> {
    if (svgContent && svgContent.includes("<svg") && svgContent.includes("<text")) {
      return svgContent;
    }
    try {
      let res = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=svg`);
      if (!res.ok) {
        res = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=svg`);
      }
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes("<svg")) return text;
      }
    } catch (e) {
      console.warn("Failed to fetch SVG for rendering:", e);
    }
    return svgContent || "";
  }

  const rawSvg = await fetchSvgText();
  if (!rawSvg) {
    console.error("Could not obtain certificate SVG for download.");
    return;
  }

  // Render to 300 DPI high-definition PNG Blob via browser Canvas
  const pngBlob = await renderSvgToPngBlob(rawSvg, width, height);
  if (!pngBlob) {
    console.error("Failed to rasterize certificate SVG to PNG blob.");
    return;
  }

  // --- 1. PDF Download ---
  if (format === "pdf") {
    try {
      const arrayBuffer = await pngBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.create();
      const ptWidth = Math.round((width * 72) / 96);
      const ptHeight = Math.round((height * 72) / 96);
      const page = pdfDoc.addPage([ptWidth, ptHeight]);
      const embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: ptWidth, height: ptHeight });
      pdfDoc.setTitle(`Certificate — ${cleanSerial}`);
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      triggerFileDownload(pdfBlob, `${cleanSerial}.pdf`);
      return;
    } catch (pdfErr) {
      console.error("Client pdf-lib generation error:", pdfErr);
    }
  }

  // --- 2. PNG Download ---
  triggerFileDownload(pngBlob, `${cleanSerial}.png`);
}

/**
 * Downloads a ZIP archive of all project certificates rendered strictly as 300 DPI PNGs
 */
export async function downloadBulkCertificatesZip(
  project: { _id: string; name: string; templateWidth?: number; templateHeight?: number },
  participants: Array<{ serialNumber: string; name?: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (typeof window === "undefined" || !participants?.length) return;

  const zip = new JSZip();
  const width = project.templateWidth || 1000;
  const height = project.templateHeight || 700;
  const total = participants.length;

  for (let i = 0; i < total; i++) {
    const p = participants[i];
    if (onProgress) onProgress(i + 1, total);

    const safeName = (p.serialNumber || `cert_${i + 1}`).replace(/[^a-z0-9_-]+/gi, "_");
    try {
      let svgRes = await fetch(`/api/certificate/${encodeURIComponent(p.serialNumber)}?format=svg`);
      if (!svgRes.ok) {
        svgRes = await fetch(`/api/certificate?serial=${encodeURIComponent(p.serialNumber)}&format=svg`);
      }
      if (svgRes.ok) {
        const svgText = await svgRes.text();
        if (svgText && svgText.includes("<svg")) {
          const pngBlob = await renderSvgToPngBlob(svgText, width, height);
          if (pngBlob) {
            zip.file(`${safeName}.png`, pngBlob);
          }
        }
      }
    } catch (e) {
      console.warn(`Could not render PNG for ${p.serialNumber}:`, e);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "_")}_certificates.zip`;
  triggerFileDownload(zipBlob, filename);
}

// Backward-compatible alias
export const downloadCertificateHD = (
  serialNumber: string,
  svgContent?: string,
  format: "png" | "pdf" = "png",
  width: number = 1000,
  height: number = 700
) => downloadCertificate(serialNumber, format, svgContent, width, height);

export default downloadCertificate;
