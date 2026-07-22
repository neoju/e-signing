import { PDFDocument, StandardFonts } from "pdf-lib";
import { dataUrlToBytes, downloadBlob } from "@/lib/file-utils";
import type { Field } from "@/types/pdf-editor";

export async function buildSignedPdfBytes(
  pdfBytes: ArrayBuffer,
  fields: Field[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const docPages = doc.getPages();
  for (const field of fields) {
    const page = docPages[field.pageIndex];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const x = field.x * pw;
    const w = field.w * pw;
    const h = field.h * ph;
    // pdf-lib origin is bottom-left; ours is top-left
    const yTop = field.y * ph;
    const yBottom = ph - yTop - h;
    if (field.kind === "signature" && field.value) {
      const pngBytes = dataUrlToBytes(field.value);
      const img = await doc.embedPng(pngBytes);
      page.drawImage(img, { x, y: yBottom, width: w, height: h });
    } else if (field.value) {
      const fontSize = Math.min(18, Math.max(8, h * 0.6));
      page.drawText(field.value, {
        x,
        y: yBottom + h * 0.25,
        size: fontSize,
        font: helv,
      });
    }
  }
  return doc.save();
}

export async function exportSignedPdf(
  pdfBytes: ArrayBuffer,
  fields: Field[],
  fileName: string,
) {
  const out = await buildSignedPdfBytes(pdfBytes, fields);
  downloadBlob(
    new Blob([out], { type: "application/pdf" }),
    fileName.replace(/\.pdf$/i, "") + "-signed.pdf",
  );
}
