import { PDFDocument } from "pdf-lib";

/**
 * Converts a PNG image buffer into a standard, high-definition PDF document buffer.
 * Dimensions are calculated in points (72 DPI) matching the certificate's aspect ratio.
 *
 * @param {Buffer|Uint8Array} pngBuffer - Raw PNG image data
 * @param {number} width - Certificate pixel width (default: 1000)
 * @param {number} height - Certificate pixel height (default: 700)
 * @param {string} [title="Certificate"] - Document title metadata
 * @returns {Promise<Buffer>} - Standard PDF file buffer
 */
export async function pngToPdfBuffer(pngBuffer, width = 1000, height = 700, title = "Certificate of Verification") {
  if (!pngBuffer || pngBuffer.length === 0) {
    throw new Error("Cannot generate PDF: empty or invalid PNG buffer.");
  }

  const pdfDoc = await PDFDocument.create();

  // Dimensions in points (72 pt per inch; 96 px per inch standard CSS)
  // widthInPoints = width * 72 / 96 = width * 0.75
  const ptWidth = Math.round((width * 72) / 96);
  const ptHeight = Math.round((height * 72) / 96);

  const page = pdfDoc.addPage([ptWidth, ptHeight]);

  const embeddedImage = await pdfDoc.embedPng(pngBuffer);

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: ptWidth,
    height: ptHeight,
  });

  pdfDoc.setTitle(title);
  pdfDoc.setCreator("VeriMoo Certificate System");
  pdfDoc.setProducer("VeriMoo Engine");

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
