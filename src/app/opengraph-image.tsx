import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OrzuX — AI Business Communication Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(145deg, #060b12 0%, #0f172a 55%, #111827 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f172a",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            X
          </div>
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.04em" }}>OrzuX</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <p
            style={{
              fontSize: 58,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              margin: 0,
            }}
          >
            AI communication platform for modern revenue teams
          </p>
          <p style={{ fontSize: 26, lineHeight: 1.4, color: "rgba(255,255,255,0.62)", margin: 0 }}>
            Unified inbox · Voice AI · CRM · Calendar · Analytics
          </p>
        </div>

        <p style={{ fontSize: 22, color: "rgba(255,255,255,0.45)", margin: 0 }}>orzux.com</p>
      </div>
    ),
    size,
  );
}
