import { Upload, FileSignature } from "lucide-react";

export function Uploader({
  onFile,
  onDrop,
  onDragOver,
}: {
  onFile: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted sm:mb-8">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
            <FileSignature className="h-3.5 w-3.5" />
          </div>
          <span className="text-base font-semibold text-text">SignFlow</span>
        </div>
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-panel/60 px-4 py-14 text-center transition hover:border-accent hover:bg-panel sm:px-6 sm:py-24"
        >
          <Upload className="mb-4 h-8 w-8 text-accent" />
          <h2 className="mb-2 text-xl font-semibold sm:text-2xl">Drop your PDF here</h2>
          <p className="mb-6 text-sm text-muted">or tap to choose a file — max 50 MB</p>
          <span className="btn-primary">Choose PDF</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        <p className="mt-6 text-center text-xs text-muted">
          Your file is processed entirely in your browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
