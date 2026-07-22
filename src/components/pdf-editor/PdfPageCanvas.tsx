import clsx from "clsx";
import type { Field, FieldKind, RenderedPage } from "@/types/pdf-editor";
import { FieldBox } from "./FieldBox";

export function PdfPageCanvas({
  page,
  pageIndex,
  totalPages,
  fields,
  tool,
  selectedFieldId,
  onSelectField,
  onChangeField,
  onRemoveField,
  onPlaceField,
  pageRef,
}: {
  page: RenderedPage;
  pageIndex: number;
  totalPages: number;
  fields: Field[];
  tool: FieldKind | null;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onChangeField: (id: string, patch: Partial<Field>) => void;
  onRemoveField: (id: string) => void;
  onPlaceField: (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => void;
  pageRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={pageRef}
      data-page-index={pageIndex}
      className={clsx(
        "relative mx-auto w-full overflow-hidden rounded-md shadow-2xl",
        tool && "cursor-crosshair ring-2 ring-accent/60",
      )}
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
      onClick={(e) => onPlaceField(pageIndex, e)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.dataUrl}
        alt={`page ${pageIndex + 1}`}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        draggable={false}
      />
      {fields
        .filter((f) => f.pageIndex === pageIndex)
        .map((f) => (
          <FieldBox
            key={f.id}
            field={f}
            selected={selectedFieldId === f.id}
            onSelect={() => onSelectField(f.id)}
            onChange={(patch) => onChangeField(f.id, patch)}
            onRemove={() => onRemoveField(f.id)}
          />
        ))}
      <div className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
        Page {pageIndex + 1} / {totalPages}
      </div>
    </div>
  );
}
