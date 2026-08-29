import { PDFDocument } from "pdf-lib";

/**
 * Universal Dual-Format (PNG & PDF) Certificate Downloader
 * Works in all modern desktop and mobile browsers with automatic client-side fallbacks.
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
      const targetWidth = Math.round(baseWidth * scale);
      const targetHeight = Math.round(baseHeight * scale);

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
 * Downloads the certificate in PNG or PDF format
 *
 * @param serialNumber - Certificate serial identifier
 * @param format - "png" | "pdf"
 * @param svgContent - Optional raw SVG markup for client-side rendering fallback
 * @param width - Certificate width in pixels (default: 1000)
 * @param height - Certificate height in pixels (default: 700)
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

  // --- 1. PDF Download ---
  if (format === "pdf") {
    // Attempt 1: Server-side compiled PDF
    try {
      let serverRes = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=pdf`);
      if (!serverRes.ok) {
        serverRes = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=pdf`);
      }
      if (serverRes.ok && serverRes.headers.get("content-type")?.includes("application/pdf")) {
        const blob = await serverRes.blob();
        if (blob.size > 1000) {
          triggerFileDownload(blob, `${cleanSerial}.pdf`);
          return;
        }
      }
    } catch (err) {
      console.warn("Server-side PDF download failed, trying client-side compiler:", err);
    }

    // Attempt 2: Client-side PDF generation via Canvas + pdf-lib
    let svgToRender = svgContent;
    if (!svgToRender) {
      try {
        let svgRes = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=svg`);
        if (!svgRes.ok) {
          svgRes = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=svg`);
        }
        if (svgRes.ok) svgToRender = await svgRes.text();
      } catch (e) {
        console.warn("Could not fetch SVG for client-side PDF:", e);
      }
    }

    if (svgToRender) {
      const pngBlob = await renderSvgToPngBlob(svgToRender, width, height);
      if (pngBlob) {
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
          console.error("Client-side pdf-lib generation error:", pdfErr);
        }
      }
    }

    // Fallback: direct window anchor navigation
    const fallbackA = document.createElement("a");
    fallbackA.href = `/api/certificate/${encodeURIComponent(cleanSerial)}?format=pdf`;
    fallbackA.download = `${cleanSerial}.pdf`;
    fallbackA.target = "_blank";
    document.body.appendChild(fallbackA);
    fallbackA.click();
    document.body.removeChild(fallbackA);
    return;
  }

  // --- 2. PNG Download ---
  // Attempt 1: Server-side 300 DPI PNG
  try {
    let serverRes = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=png`);
    if (!serverRes.ok) {
      serverRes = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=png`);
    }
    if (serverRes.ok && serverRes.headers.get("content-type")?.includes("image/png")) {
      const blob = await serverRes.blob();
      if (blob.size > 1000) {
        triggerFileDownload(blob, `${cleanSerial}.png`);
        return;
      }
    }
  } catch (err) {
    console.warn("Server-side PNG download failed, using client-side canvas renderer:", err);
  }

  // Attempt 2: Client-side HTML5 Canvas rasterization at 300 DPI
  let svgToRender = svgContent;
  if (!svgToRender) {
    try {
      let svgRes = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=svg`);
      if (!svgRes.ok) {
        svgRes = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=svg`);
      }
      if (svgRes.ok) svgToRender = await svgRes.text();
    } catch (e) {
      console.warn("Could not fetch SVG for canvas rendering:", e);
    }
  }

  if (svgToRender) {
    const pngBlob = await renderSvgToPngBlob(svgToRender, width, height);
    if (pngBlob) {
      triggerFileDownload(pngBlob, `${cleanSerial}.png`);
      return;
    }
  }

  // Fallback: direct window anchor navigation
  const fallbackA = document.createElement("a");
  fallbackA.href = `/api/certificate/${encodeURIComponent(cleanSerial)}?format=png`;
  fallbackA.download = `${cleanSerial}.png`;
  fallbackA.target = "_blank";
  document.body.appendChild(fallbackA);
  fallbackA.click();
  document.body.removeChild(fallbackA);
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
