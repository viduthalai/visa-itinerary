/*
 * Twitter/X uses the same card as Open Graph. Re-exporting the OG generator
 * means one image definition, two conventions — Next treats twitter-image as
 * its own file convention, so it needs the exports present here, but there is
 * no reason to draw a second card.
 */
export { default, alt, size, contentType } from "./opengraph-image";
