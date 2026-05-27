import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Live Fact-Checking Assistant — Verify claims at conversation speed";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.25), rgba(9,9,11,1) 60%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#34d399",
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#34d399",
              fontWeight: 600,
            }}
          >
            Live Fact-Check
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Verify claims at conversation speed.
          </div>
          <div style={{ fontSize: 30, color: "#a1a1aa", maxWidth: 900 }}>
            Real-time co-pilot for podcasters, news hosts, and live broadcasters.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 22, color: "#71717a" }}>
          <span>Deepgram · Nova-3</span>
          <span>·</span>
          <span>Claude Haiku</span>
          <span>·</span>
          <span>Perplexity Sonar</span>
        </div>
      </div>
    ),
    size,
  );
}
