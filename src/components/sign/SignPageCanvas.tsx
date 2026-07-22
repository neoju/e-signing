import type { Field, RenderedPage } from "@/types/pdf-editor";
import { SignFieldBox } from "./SignFieldBox";

export function SignPageCanvas({
  page,
  pageIndex,
  totalPages,
  fields,
  onChangeField,
  onSignatureClick,
}: {
  page: RenderedPage;
  pageIndex: number;
  totalPages: number;
  fields: Field[];
  onChangeField: (id: string, patch: Partial<Field>) => void;
  onSignatureClick: (id: string) => void;
}) {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-md shadow-2xl"
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
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
          <SignFieldBox
            key={f.id}
            field={f}
            onChange={(patch) => onChangeField(f.id, patch)}
            onSignatureClick={() => onSignatureClick(f.id)}
          />
        ))}
      <div className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
        Page {pageIndex + 1} / {totalPages}
      </div>
    </div>
  );
}
