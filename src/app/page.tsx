"use client";

import dynamic from "next/dynamic";

const PdfEditor = dynamic(
  () => import("@/components/PdfEditor").then((m) => m.PdfEditor),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        Loading…
      </div>
    ),
  },
);

export default function Home() {
  return <PdfEditor />;
}
