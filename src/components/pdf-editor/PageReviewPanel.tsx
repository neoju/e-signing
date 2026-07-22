import clsx from "clsx";
import type { RenderedPage } from "@/types/pdf-editor";

export function PageReviewPanel({
  pages,
  activePage,
  onJump,
  className,
}: {
  pages: RenderedPage[];
  activePage: number;
  onJump: (index: number) => void;
  className?: string;
}) {
  return (
    <aside
      className={clsx(
        "w-44 shrink-0 overflow-y-auto border-l border-border bg-panel p-3",
        className,
      )}
    >
      <p className="mb-3 text-xs uppercase tracking-widest text-muted">
        Pages · {pages.length}
      </p>
      <div className="space-y-3">
        {pages.map((p, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={clsx(
              "block w-full overflow-hidden rounded-md border-2 text-left transition",
              activePage === i
                ? "border-accent"
                : "border-transparent hover:border-accent/40",
            )}
            aria-label={`Go to page ${i + 1}`}
          >
            <div
              className="relative w-full overflow-hidden rounded-[4px] bg-white"
              style={{ aspectRatio: `${p.width} / ${p.height}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={`Page ${i + 1} thumbnail`}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                draggable={false}
              />
            </div>
            <div
              className={clsx(
                "py-1 text-center text-[11px]",
                activePage === i ? "font-medium text-text" : "text-muted",
              )}
            >
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
