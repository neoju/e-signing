import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#f5f5f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#7c5cff",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            SignFlow
          </span>
        </div>
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -1.5 }}>
          Sign PDFs in seconds.
        </div>
        <div style={{ fontSize: 26, color: "#8a8a94", marginTop: 18 }}>
          No sign-up. Nothing leaves your device.
        </div>
      </div>
    ),
    { ...size },
  );
}
