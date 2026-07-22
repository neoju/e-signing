import { Upload, Download, FileSignature } from "lucide-react";
import clsx from "clsx";

export function TopBar({
  fileName,
  onReset,
  onExport,
  exporting,
  canExport,
}: {
  fileName: string;
  onReset: () => void;
  onExport: () => void;
  exporting: boolean;
  canExport: boolean;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2.5 sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-white">
          <FileSignature className="h-3.5 w-3.5" />
        </div>
        <span className="min-w-0 truncate text-sm font-medium">{fileName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button onClick={onReset} className="btn-ghost !px-3 sm:!px-5">
          <span className="hidden sm:inline">Change file</span>
          <Upload className="h-4 w-4 sm:hidden" />
        </button>
        <button
          onClick={onExport}
          disabled={!canExport || exporting}
          className={clsx(
            "btn-primary !px-3 sm:!px-5",
            (!canExport || exporting) && "cursor-not-allowed opacity-50",
          )}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">
            {exporting ? "Exporting…" : "Download signed"}
          </span>
        </button>
      </div>
    </header>
  );
}
