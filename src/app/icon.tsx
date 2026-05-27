import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "#34d399",
            boxShadow: "0 0 24px rgba(52,211,153,0.6)",
          }}
        />
      </div>
    ),
    size,
  );
}
