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

// DOCUMENT_TITLE moved to lib/documentVoice.ts — the title is one of five strings
// that must agree about what this document is, so it lives with the other four.
