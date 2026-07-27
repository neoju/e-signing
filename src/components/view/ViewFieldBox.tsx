import type { Field } from "@/types/pdf-editor";

// Purely decorative, read-only overlay — every field (sender or recipient)
// is rendered the same way regardless of who it's assigned to, since a
// shared draft link never lets anyone fill anything in.
export function ViewFieldBox({ field }: { field: Field }) {
  if (!field.value) return null;
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
        <img src={field.value} alt="signature" className="h-full w-full object-contain" />
      ) : (
        <span className="flex h-full w-full items-center px-1 text-[13px] text-black">
          {field.value}
        </span>
      )}
    </div>
  );
}
