"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, PenLine, Type, Upload, Trash2 } from "lucide-react";
import clsx from "clsx";

type Tab = "draw" | "type" | "upload";

const SIGNATURE_FONTS = [
  { id: "instrument", label: "Elegant", family: '"Instrument Serif", serif', italic: true },
  { id: "great-vibes", label: "Classic", family: '"Great Vibes", cursive', italic: false },
  { id: "dancing", label: "Casual", family: '"Dancing Script", cursive', italic: false },
] as const;

type SignatureFont = (typeof SIGNATURE_FONTS)[number];

export function SignatureModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("draw");
  const sigRef = useRef<SignatureCanvas | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 560, height: 220 });
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState<SignatureFont>(SIGNATURE_FONTS[0]);
  const [uploaded, setUploaded] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "draw") return;
    const el = canvasWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setCanvasSize({
          width: Math.round(w),
          height: Math.round(Math.min(220, Math.max(150, w * 0.39))),
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  const confirm = () => {
    if (tab === "draw") {
      const c = sigRef.current;
      if (!c || c.isEmpty()) return;
      onConfirm(c.getCanvas().toDataURL("image/png"));
      return;
    }
    if (tab === "type") {
      if (!typed.trim()) return;
      onConfirm(renderTypedSignature(typed, font));
      return;
    }
    if (tab === "upload" && uploaded) {
      onConfirm(uploaded);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-border bg-panel shadow-glow">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-base font-semibold sm:text-lg">Add your signature</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border px-2 pt-2 sm:px-3 sm:pt-3">
          <TabBtn active={tab === "draw"} onClick={() => setTab("draw")} icon={<PenLine className="h-4 w-4" />}>
            Draw
          </TabBtn>
          <TabBtn active={tab === "type"} onClick={() => setTab("type")} icon={<Type className="h-4 w-4" />}>
            Type
          </TabBtn>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={<Upload className="h-4 w-4" />}>
            Upload
          </TabBtn>
        </div>

        <div className="p-4 sm:p-6">
          {tab === "draw" && (
            <div>
              <div className="rounded-xl border border-dashed border-border bg-white p-2">
                <div ref={canvasWrapRef} className="w-full">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="#111"
                    canvasProps={{
                      width: canvasSize.width,
                      height: canvasSize.height,
                      className: "signature-canvas",
                    }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>Draw with mouse, trackpad, or finger.</span>
                <button
                  onClick={() => sigRef.current?.clear()}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/5 hover:text-text"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          )}

          {tab === "type" && (
            <div>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your full name"
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-accent"
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                {SIGNATURE_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFont(f)}
                    className={clsx(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                      font.id === f.id
                        ? "border-accent bg-accent/10 text-text"
                        : "border-border text-muted hover:text-text",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border bg-white px-4 py-8 sm:py-10">
                <span
                  className="max-w-full truncate text-3xl text-neutral-900 sm:text-5xl"
                  style={{
                    fontFamily: font.family,
                    fontStyle: font.italic ? "italic" : "normal",
                  }}
                >
                  {typed || "Your name"}
                </span>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-bg py-12 hover:bg-white/5">
                <Upload className="mb-2 h-6 w-6 text-muted" />
                <span className="text-sm text-muted">Click to upload PNG or JPG</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const b64 = await fileToDataUrl(f);
                    setUploaded(b64);
                  }}
                />
              </label>
              {uploaded && (
                <div className="mt-4 grid place-items-center rounded-xl border border-border bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploaded} alt="signature" className="max-h-40" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <button onClick={onClose} className="btn-ghost w-full justify-center sm:w-auto">Cancel</button>
          <button onClick={confirm} className="btn-primary w-full justify-center sm:w-auto">Insert signature</button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-t-lg px-2.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm",
        active ? "bg-bg text-text" : "text-muted hover:text-text",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function renderTypedSignature(text: string, font: SignatureFont): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = `${font.italic ? "italic " : ""}84px ${font.family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}
