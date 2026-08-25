/**
 * The document's VOICE — every string that says what this document *is*.
 *
 * Why this file exists: the page previously asserted its own nature in five
 * independent places — the title, the two notice paragraphs, the "Prepared by"
 * label, the document-number caption and the footer. Changing the title to
 * "Ticket & receipt" left the other four saying "travel plan, not a reservation",
 * so the same page claimed to be a ticket and denied being a booking, twice each.
 *
 * A footer edit would have fixed that instance and left the bug: five strings that
 * must agree, with nothing making them agree. So they now come from ONE object
 * chosen by ONE constant. Flipping DOCUMENT_POSTURE rewrites the whole page's
 * voice consistently, and a contradiction can only be introduced by editing this
 * file — where both variants sit side by side and disagreement is obvious.
 *
 * `ticket`  — reads as a booking record, matching the reference receipt.
 *             Vidu's call 2026-08-20. Tracked as pre-release items P-5 / P-6.
 * `plan`    — reads as a proposed itinerary and denies being a reservation.
 *             The posture the earlier requirements were written around.
 */
export type DocumentPosture = "ticket" | "plan";

export const DOCUMENT_POSTURE: DocumentPosture = "ticket";

type Voice = {
  /** Large centred heading. */
  title: string;
  /** Caption over the prepared/issued-by column. */
  issuedByLabel: string;
  /** Small print under the document number. */
  documentNumberCaption: string;
  /** Left notice column — two paragraphs. */
  noticeLeft: [string, string];
  /**
   * Footer descriptor after the tool name and date. Empty string means the footer
   * carries no claim at all, which is the correct value for the ticket posture:
   * there is nothing to add that the rest of the page has not already said.
   */
  footerDescriptor: string;
  /** Verb used for the generation date, e.g. "issued 20 Aug 2026". */
  datedVerb: string;
};

const VOICES: Record<DocumentPosture, Voice> = {
  ticket: {
    title: "Ticket & receipt",
    issuedByLabel: "Issued by / date",
    documentNumberCaption:
      "Quote this number in any correspondence about this booking. Present this document " +
      "with your passport at check-in.",
    noticeLeft: [
      "This document is your record of the journey listed below and should be kept with " +
        "your travel documents. Check-in and boarding times are shown for each leg.",
      "You may need to show this document to enter the airport, or to prove onward or " +
        "return travel to immigration.",
    ],
    footerDescriptor: "",
    datedVerb: "issued",
  },
  plan: {
    title: "Itinerary & travel plan",
    issuedByLabel: "Prepared by / date",
    documentNumberCaption:
      "Quote this number in any correspondence about this itinerary. It is an internal " +
      "reference, not an airline ticket number.",
    noticeLeft: [
      "This document sets out the intended journey listed below. It is a travel plan " +
        "prepared for your own records. It is not a reservation and confers no " +
        "entitlement to travel.",
      "You may be asked to show a travel plan at the airport or when applying for a " +
        "visa. Keep it with your travel documents.",
    ],
    footerDescriptor: "travel plan, not a reservation",
    datedVerb: "prepared",
  },
};

export const VOICE: Voice = VOICES[DOCUMENT_POSTURE];

/** Exposed for the consistency test — asserts the two variants never blend. */
export const ALL_VOICES = VOICES;
