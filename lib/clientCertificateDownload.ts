/**
 * Universal Client-Side 300 DPI HD PNG & SVG Certificate Downloader
 * Works in all modern browsers (desktop & mobile) with zero server dependencies.
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
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Renders an SVG markup string to a 300 DPI high-definition PNG using HTML5 Canvas
 */
export function renderSvgToPngAndDownload(
  svgString: string,
  filename: string,
  baseWidth: number = 1000,
  baseHeight: number = 700
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    try {
      // 300 DPI scaling factor (300 / 96 ≈ 3.125)
      const scale = 300 / 96;
      const targetWidth = Math.round(baseWidth * scale);
      const targetHeight = Math.round(baseHeight * scale);

      // Clean SVG for Image embedding
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
                if (pngBlob) {
                  triggerFileDownload(pngBlob, `${filename}.png`);
                }
                URL.revokeObjectURL(url);
                resolve();
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
        resolve();
      };

      img.onerror = () => {
        console.warn("SVG Image load error in Canvas, falling back to SVG blob download.");
        triggerFileDownload(blob, `${filename}.svg`);
        URL.revokeObjectURL(url);
        resolve();
      };

      img.src = url;
    } catch (err) {
      console.error("renderSvgToPngAndDownload fatal error:", err);
      resolve();
    }
  });
}

export async function downloadCertificateHD(
  serialNumber: string,
  svgContent?: string,
  format: "png" | "svg" = "png",
  width: number = 1000,
  height: number = 700
): Promise<void> {
  if (typeof window === "undefined") return;
  const cleanSerial = (serialNumber || "certificate").trim();

  // If format is SVG, download the SVG file directly
  if (format === "svg") {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      triggerFileDownload(blob, `${cleanSerial}.svg`);
      return;
    }
    try {
      const res = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=svg-download`);
      if (res.ok) {
        const blob = await res.blob();
        triggerFileDownload(blob, `${cleanSerial}.svg`);
        return;
      }
    } catch {
      // fallback
    }
  }

  // First attempt: Server-side Sharp HD PNG (if available)
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
    console.warn("Server-side PNG download failed, using high-resolution browser canvas renderer:", err);
  }

  // Second attempt: High-resolution client-side HTML5 Canvas rasterization at 300 DPI
  let svgToRender = svgContent;
  if (!svgToRender) {
    try {
      let svgRes = await fetch(`/api/certificate/${encodeURIComponent(cleanSerial)}?format=svg`);
      if (!svgRes.ok) {
        svgRes = await fetch(`/api/certificate?serial=${encodeURIComponent(cleanSerial)}&format=svg`);
      }
      if (svgRes.ok) {
        svgToRender = await svgRes.text();
      }
    } catch (e) {
      console.warn("Could not fetch SVG for canvas rendering:", e);
    }
  }

  if (svgToRender) {
    await renderSvgToPngAndDownload(svgToRender, cleanSerial, width, height);
    return;
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

export default downloadCertificateHD;

