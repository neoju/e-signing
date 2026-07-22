import { PenLine } from "lucide-react";
import type { Field } from "@/types/pdf-editor";

export function SignFieldBox({
  field,
  onChange,
  onSignatureClick,
}: {
  field: Field;
  onChange: (patch: Partial<Field>) => void;
  onSignatureClick: () => void;
}) {
  if (field.assignee === "sender") {
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${field.x * 100}%`,
          top: `${field.y * 100}%`,
          width: `${field.w * 100}%`,
          height: `${field.h * 100}%`,
        }}
      >
        {field.kind === "signature" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={field.value}
            alt="signature"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex h-full w-full items-center px-1 text-[13px] text-black">
            {field.value}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute rounded border-2 border-accent/70 bg-accent/5"
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.w * 100}%`,
        height: `${field.h * 100}%`,
      }}
    >
      {field.kind === "signature" &&
        (field.value ? (
          <button onClick={onSignatureClick} className="absolute inset-0 h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={field.value}
              alt="signature"
              className="pointer-events-none h-full w-full object-contain"
            />
          </button>
        ) : (
          <button
            onClick={onSignatureClick}
            className="flex h-full w-full items-center justify-center gap-1.5 rounded bg-white text-[11px] font-medium text-accent shadow-sm"
          >
            <PenLine className="h-3.5 w-3.5" />
            Click to sign
          </button>
        ))}
      {field.kind === "text" && (
        <input
          value={field.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Type…"
          className="absolute inset-0 h-full w-full rounded bg-white px-1 text-[13px] text-black outline-none ring-2 ring-transparent focus:ring-accent"
        />
      )}
      {field.kind === "date" && (
        <input
          value={field.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Date…"
          className="absolute inset-0 h-full w-full rounded bg-white px-1 text-[13px] text-black outline-none ring-2 ring-transparent focus:ring-accent"
        />
      )}
    </div>
  );
}
