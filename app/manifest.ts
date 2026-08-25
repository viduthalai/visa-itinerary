import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/**
 * Serves /manifest.webmanifest. It makes the tool installable as a PWA and
 * gives Android/Chrome the name, colours and icon to use for the home-screen
 * entry and the address-bar theme. Colours match the app shell so the launch
 * screen and browser chrome do not flash a foreign colour.
 *
 * The one SVG is listed twice — as "any" and as "maskable" — so it covers both
 * plain and safe-zone icon masks without a separate raster set. (The manifest
 * spec allows "any maskable" in one entry, but Next's type wants one purpose per
 * icon, so this is the type-clean way to say the same thing.)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    /* Must track --color-canvas in globals.css. These paint the PWA splash and the
       Android address bar, so a stale value here flashes the previous theme's
       colour before the app renders. Was #171310 (the warm-paper build). */
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
