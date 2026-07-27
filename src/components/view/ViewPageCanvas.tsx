import type { Field, RenderedPage } from "@/types/pdf-editor";
import { ViewFieldBox } from "./ViewFieldBox";

export function ViewPageCanvas({
  page,
  pageIndex,
  totalPages,
  fields,
}: {
  page: RenderedPage;
  pageIndex: number;
  totalPages: number;
  fields: Field[];
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
          <ViewFieldBox key={f.id} field={f} />
        ))}
      <div className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
        Page {pageIndex + 1} / {totalPages}
      </div>
    </div>
  );
}
