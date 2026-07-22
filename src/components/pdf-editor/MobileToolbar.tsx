import { PenLine, Type as TypeIcon, Calendar } from "lucide-react";
import clsx from "clsx";
import type { FieldKind } from "@/types/pdf-editor";

const TOOL_ITEMS: { kind: FieldKind; label: string; icon: React.ElementType }[] = [
  { kind: "signature", label: "Sign", icon: PenLine },
  { kind: "text", label: "Text", icon: TypeIcon },
  { kind: "date", label: "Date", icon: Calendar },
];

export function MobileToolbar({
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
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-border bg-panel px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
      aria-label="Editing tools"
    >
      {TOOL_ITEMS.map((it) => (
        <button
          key={it.kind}
          onClick={() => setTool(tool === it.kind ? null : it.kind)}
          className={clsx(
            "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition",
            tool === it.kind
              ? "bg-accent/10 text-accent"
              : "text-muted active:bg-white/5",
          )}
        >
          <it.icon className="h-5 w-5" />
          {it.label}
        </button>
      ))}
      <button
        onClick={onEditSig}
        className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium text-muted active:bg-white/5"
      >
        {savedSig ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={savedSig}
            alt=""
            className="h-5 w-9 rounded-sm bg-white object-contain"
          />
        ) : (
          <PenLine className="h-5 w-5" />
        )}
        {savedSig ? "Change" : "New sig"}
      </button>
    </nav>
  );
}
