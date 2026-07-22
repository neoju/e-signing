import type { RenderedPage } from "@/types/pdf-editor";

export async function renderPdfPages(buf: ArrayBuffer): Promise<RenderedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const out: RenderedPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push({
      width: viewport.width,
      height: viewport.height,
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
    });
  }
  return out;
}
