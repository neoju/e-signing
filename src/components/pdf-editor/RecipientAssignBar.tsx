import { Send } from "lucide-react";
import clsx from "clsx";

export function RecipientAssignBar({
  areaCount,
  onCancel,
  onGenerate,
  generating,
}: {
  areaCount: number;
  onCancel: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-panel px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-accent2">
          Add areas for the next signer
        </p>
        <p className="text-xs text-muted">
          Pick a tool, then click on the document. You can add multiple areas.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button onClick={onCancel} className="btn-ghost !px-3 sm:!px-5">
          Cancel
        </button>
        <button
          onClick={onGenerate}
          disabled={areaCount === 0 || generating}
          className={clsx(
            "btn-primary !px-3 sm:!px-5",
            (areaCount === 0 || generating) && "cursor-not-allowed opacity-50",
          )}
        >
          <Send className="h-4 w-4" />
          <span>
            {generating
              ? "Generating…"
              : areaCount > 0
                ? `Generate link (${areaCount})`
                : "Generate link"}
          </span>
        </button>
      </div>
    </header>
  );
}
