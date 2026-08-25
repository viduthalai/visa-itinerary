/**
 * Copy that is consumed by more than one surface lives here so the surfaces
 * cannot disagree.
 *
 * The FAQ is the case that forced this file: Google's FAQPage rich result is
 * only valid if the structured data is an exact match for the FAQ visible on
 * the page. When the questions were an inline literal in page.tsx, adding a
 * JSON-LD block meant a second copy — and the moment someone edited one, the
 * rich result would either vanish or (worse) advertise an answer the page no
 * longer shows. One array, rendered once and serialised once, makes that
 * impossible.
 */
export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is this a booking?",
    a: "No. It builds a document from details you enter. Nothing is reserved with any airline and no payment is taken.",
  },
  {
    q: "Where does my data go?",
    a: "Nowhere. Everything stays in your browser: there is no account and no database. Closing the tab discards it.",
  },
  {
    q: "Are the flight times real?",
    a: "Times come from the flight search where a provider is configured, and are recalculated in each airport's own timezone. Without a provider token the search returns clearly-labelled sample data.",
  },
  {
    q: "Why is the reference number 6 characters?",
    a: "It matches the shape airlines use. It is generated locally and resolves nowhere, so treat it as a document number rather than something anyone can look up.",
  },
];
