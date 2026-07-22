import { PenLine, Type as TypeIcon, Calendar } from "lucide-react";
import clsx from "clsx";
import type { FieldKind } from "@/types/pdf-editor";

const TOOL_ITEMS: { kind: FieldKind; label: string; icon: React.ElementType }[] = [
  { kind: "signature", label: "Signature", icon: PenLine },
  { kind: "text", label: "Text", icon: TypeIcon },
  { kind: "date", label: "Date", icon: Calendar },
];

export function Sidebar({
  tool,
  setTool,
  savedSig,
  onEditSig,
}: {
  tool: FieldKind | null;
  setTool: (t: FieldKind | null) => void;
  savedSig: string | null;
  onEditSig: () => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-panel p-4 md:flex md:flex-col">
      <p className="mb-3 text-xs uppercase tracking-widest text-muted">Tools</p>
      <div className="space-y-1.5">
        {TOOL_ITEMS.map((it) => (
          <button
            key={it.kind}
            onClick={() => setTool(tool === it.kind ? null : it.kind)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition",
              tool === it.kind
                ? "border-accent/50 bg-accent/10 text-text"
                : "text-muted hover:bg-white/5 hover:text-text",
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </button>
        ))}
      </div>

      <p className="mb-3 mt-8 text-xs uppercase tracking-widest text-muted">
        Your signature
      </p>
      {savedSig ? (
        <div className="rounded-lg border border-border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={savedSig} alt="saved signature" className="h-14 w-full object-contain" />
          <button
            onClick={onEditSig}
            className="mt-2 w-full rounded-md py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={onEditSig}
          className="w-full rounded-lg border border-dashed border-border py-6 text-xs text-muted hover:border-accent hover:text-text"
        >
          + Create signature
        </button>
      )}

      <div className="mt-8 rounded-lg border border-border bg-bg p-3 text-xs text-muted">
        <p className="mb-1 font-medium text-text">Tip</p>
        Click a tool, then click on the page to place. Drag fields to reposition, or
        drag the corner handle to resize.
      </div>
    </aside>
  );
}
