import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/*
 * The social share card, generated at build time — no static PNG to keep in
 * sync, and no design tool round-trip when the copy changes. next/og ships with
 * Next, so this adds no dependency.
 *
 * The palette is the app's own: the monochrome shell — near-black canvas, bright
 * neutral ink, one cold-blue accent (the on-dark tuning, #2563eb). That is
 * deliberate — the card mirrors the SHELL a visitor lands on, not the warm-paper
 * document the tool outputs, so a link preview and the site read as one thing.
 * (It used to copy the document: warm paper, brick-red accent. The redesign made
 * that a washed-out echo of the product's own output, so the card follows the
 * shell now; the deliverable stays warm-red on its own surface.) Never pure #000,
 * for the same OLED/elevation reason globals.css gives. Layout is pure flexbox
 * because Satori (what next/og renders with) supports only a subset of CSS; grid
 * and most positioning are unavailable.
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
          backgroundColor: "#0b0b0d",
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
              backgroundColor: "#2563eb",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#fafafa" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#fafafa",
              letterSpacing: "-0.02em",
            }}
          >
            Build a travel itinerary
          </div>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.05, color: "#a1a1aa" }}>
            that gets the times right
          </div>
          <div
            style={{ marginTop: 34, width: 132, height: 8, borderRadius: 4, backgroundColor: "#2563eb" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 30, color: "#a1a1aa", maxWidth: 760 }}>
            Timezone-correct itinerary PDFs. No account, nothing stored.
          </div>
          <div style={{ fontSize: 26, color: "#7c7c86" }}>{host}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
