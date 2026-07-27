import { NextResponse } from "next/server";

// Cap uploaded PDFs (original + signed) at 20 MB. Enforced by every route
// handler that accepts a `file` form part; the browser also refuses to
// load anything larger from the Uploader so we don't waste an upload round
// trip in the common case.
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_MB = 20;

// Returns a 413 response when the parsed multipart `file` exceeds the cap,
// otherwise null. Call this right after asserting `file instanceof Blob`.
export function pdfTooLarge(file: Blob): NextResponse | null {
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF is too large (max ${MAX_PDF_MB} MB)` },
      { status: 413 },
    );
  }
  return null;
}
