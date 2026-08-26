import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/*
 * The social share card, generated at build time — no static PNG to keep in
 * sync, and no design tool round-trip when the copy changes. next/og ships with
 * Next, so this adds no dependency.
 *
 * The palette is the app's own: warm paper ground, espresso ink, the document
 * red as the single accent. That is deliberate — the card should look like the
 * material the tool produces, so a link preview and the product read as one
 * thing. Layout is pure flexbox because Satori (what next/og renders with)
 * supports only a subset of CSS; grid and most positioning are unavailable.
 */
export const alt = `${SITE_NAME}: build a travel itinerary document that gets the times right`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const host = SITE_URL.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f1efe9",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: "#c9382e",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#2a2320" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#1c1917",
              letterSpacing: "-0.02em",
            }}
          >
            Build a travel itinerary
          </div>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.05, color: "#6b6459" }}>
            that gets the times right
          </div>
          <div
            style={{ marginTop: 34, width: 132, height: 8, borderRadius: 4, backgroundColor: "#c9382e" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 30, color: "#4a443d", maxWidth: 760 }}>
            Timezone-correct itinerary PDFs. No account, nothing stored.
          </div>
          <div style={{ fontSize: 26, color: "#6b6459" }}>{host}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
