/**
 * One source of truth for everything a crawler, a social card, or a JSON-LD
 * block needs to know about this site. `metadata`, `sitemap.ts`, `robots.ts`,
 * `manifest.ts` and the structured-data blocks all read from here, so the URL,
 * name and description can only be stated once — the same discipline that keeps
 * documentVoice.ts from letting the page contradict itself.
 *
 * SITE_URL is the ONE value you must set before a real deploy. metadataBase,
 * every canonical link, the sitemap and the absolute OG image URL are all built
 * from it; a wrong value here silently poisons all of them. It is read from
 * NEXT_PUBLIC_SITE_URL so the production domain never has to be hard-coded, with
 * a documented fallback for local builds. See README → Deployment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://visa-itinerary.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Visa Itinerary";

export const SITE_TAGLINE = "Build a travel itinerary document that gets the times right";

export const SITE_DESCRIPTION =
  "Build a clean, timezone-correct travel itinerary document and save it as a PDF. " +
  "Search a route, choose your flights, add passengers — everything runs in your " +
  "browser with no account and no database.";

export const AUTHOR_NAME = "Viduthalai Mani";
export const AUTHOR_URL = "https://github.com/viduthalai";

/**
 * Keywords are a weak ranking signal on their own, but they double as the
 * vocabulary the OG description and headings are checked against for
 * consistency. Kept honest: this tool makes an itinerary document, not a
 * booking or a ticket, so the terms describe what it actually produces.
 */
export const SITE_KEYWORDS = [
  "travel itinerary",
  "flight itinerary",
  "itinerary document",
  "itinerary maker",
  "travel itinerary generator",
  "flight itinerary for visa application",
  "itinerary PDF",
  "timezone-correct flight times",
  "one-way itinerary",
  "round-trip itinerary",
];

/** Absolute URL helper — every schema and card needs fully-qualified links. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
