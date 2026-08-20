/**
 * Single switch for the SPECIMEN marking on the generated document.
 *
 * Deliberately one boolean in one place rather than literals scattered through
 * the template: flipping it is a one-line change, not a refactor. Vidu's call
 * 2026-08-20 was to build without disclaimers, so it ships off.
 *
 * Before any customer uses this, see
 * /Users/vidu/life-docs/app-ideas/visa-itinerary-prerelease-checklist.md (item P-1).
 */
export const SPECIMEN_MARKING = false;

/** Shown in the document footer so the artifact's provenance is on its face. */
export const TOOL_NAME = "Visa Itinerary";

/**
 * Title printed at the top of the generated document.
 *
 * Vidu's call 2026-08-20: match the reference receipt exactly — "Ticket &
 * receipt". Kept as one constant in one place because this string is the single
 * strongest claim the page makes: "receipt" asserts a completed transaction and
 * "ticket" asserts a contract of carriage, and neither exists. That is a
 * pre-release decision, not a rendering detail — see item P-2 of
 * /Users/vidu/life-docs/app-ideas/visa-itinerary-prerelease-checklist.md.
 * Changing it later is a one-line edit here, not a template rewrite.
 */
export const DOCUMENT_TITLE = "Ticket & receipt";
