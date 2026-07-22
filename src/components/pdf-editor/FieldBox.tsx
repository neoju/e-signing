import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Field } from "@/types/pdf-editor";

export function FieldBox({
  field,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Field>) => void;
  onRemove: () => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const minW = field.kind === "signature" ? 0.06 : 0.05;
  const minH = field.kind === "signature" ? 0.025 : 0.02;

  const startDrag = (startX: number, startY: number) => {
    setDragging(true);
    const parent = boxRef.current?.parentElement as HTMLElement;
    const rect = parent.getBoundingClientRect();
    const origX = field.x;
    const origY = field.y;
    return { rect, origX, origY, startX, startY };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const { rect, origX, origY, startX, startY } = startDrag(e.clientX, e.clientY);

    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      onChange({
        x: Math.min(1 - field.w, Math.max(0, origX + dx)),
        y: Math.min(1 - field.h, Math.max(0, origY + dy)),
      });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onSelect();
    const touch = e.touches[0];
    if (!touch) return;
    const { rect, origX, origY, startX, startY } = startDrag(touch.clientX, touch.clientY);

    const move = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      ev.preventDefault();
      const dx = (t.clientX - startX) / rect.width;
      const dy = (t.clientY - startY) / rect.height;
      onChange({
        x: Math.min(1 - field.w, Math.max(0, origX + dx)),
        y: Math.min(1 - field.h, Math.max(0, origY + dy)),
      });
    };
    const end = () => {
      setDragging(false);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  };

  const startResize = (startX: number, startY: number) => {
    setResizing(true);
    const parent = boxRef.current?.parentElement as HTMLElement;
    const rect = parent.getBoundingClientRect();
    const origW = field.w;
    const origH = field.h;
    return { rect, origW, origH, startX, startY };
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { rect, origW, origH, startX, startY } = startResize(e.clientX, e.clientY);

    const move = (ev: MouseEvent) => {
      const dw = (ev.clientX - startX) / rect.width;
      const dh = (ev.clientY - startY) / rect.height;
      onChange({
        w: Math.min(1 - field.x, Math.max(minW, origW + dw)),
        h: Math.min(1 - field.y, Math.max(minH, origH + dh)),
      });
    };
    const up = () => {
      setResizing(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onResizeTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    const { rect, origW, origH, startX, startY } = startResize(touch.clientX, touch.clientY);

    const move = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      ev.preventDefault();
      const dw = (t.clientX - startX) / rect.width;
      const dh = (t.clientY - startY) / rect.height;
      onChange({
        w: Math.min(1 - field.x, Math.max(minW, origW + dw)),
        h: Math.min(1 - field.y, Math.max(minH, origH + dh)),
      });
    };
    const end = () => {
      setResizing(false);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  };

  const isRecipient = field.assignee === "recipient";

  return (
    <div
      ref={boxRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={clsx(
        "group absolute cursor-move rounded border-2 bg-accent/5",
        isRecipient ? "border-accent2/70" : "border-accent/70",
        (dragging || resizing || selected) &&
          (isRecipient ? "ring-2 ring-accent2" : "ring-2 ring-accent"),
      )}
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.w * 100}%`,
        height: `${field.h * 100}%`,
      }}
    >
      <span
        className={clsx(
          "absolute -top-5 left-0 whitespace-nowrap rounded-t px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white",
          isRecipient ? "bg-accent2" : "bg-accent",
        )}
      >
        {isRecipient ? "Next signer" : "You"}
      </span>
      {field.kind === "signature" && field.value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={field.value}
          alt="signature"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      )}
      {field.kind === "text" && (
        <input
          value={field.value}
          onChange={(e) => onChange({ value: e.target.value })}
          onFocus={onSelect}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Type…"
          className="absolute inset-0 w-full bg-transparent px-1 text-[13px] text-black outline-none"
        />
      )}
      {field.kind === "date" && (
        <input
          value={field.value}
          onChange={(e) => onChange({ value: e.target.value })}
          onFocus={onSelect}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute inset-0 w-full bg-transparent px-1 text-[13px] text-black outline-none"
        />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={clsx(
          "absolute -right-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow-md transition-opacity md:-right-2 md:-top-2 md:h-5 md:w-5",
          selected || dragging || resizing
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
        )}
        aria-label="Remove"
      >
        <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onResizeMouseDown}
        onTouchStart={(e) => {
          onSelect();
          onResizeTouchStart(e);
        }}
        className={clsx(
          "absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-accent shadow transition-opacity md:-bottom-1.5 md:-right-1.5 md:h-3.5 md:w-3.5",
          selected || resizing
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100",
        )}
        aria-label="Resize"
      />
    </div>
  );
}
