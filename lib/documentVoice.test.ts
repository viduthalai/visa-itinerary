import { describe, expect, it } from "vitest";
import { ALL_VOICES, DOCUMENT_POSTURE, VOICE } from "@/lib/documentVoice";

/**
 * These tests exist because of a real defect: the title said "Ticket & receipt"
 * while the footer said "travel plan, not a reservation" and the body copy said
 * "it is not a reservation". Five strings had to agree and nothing made them.
 *
 * The assertions below are the thing that now makes them agree.
 */
describe("document voice consistency", () => {
  const DENIALS = [/not a reservation/i, /not an airline ticket/i, /confers no entitlement/i];

  function allStrings(v: typeof VOICE): string[] {
    return [
      v.title,
      v.issuedByLabel,
      v.documentNumberCaption,
      ...v.noticeLeft,
      v.footerDescriptor,
      v.datedVerb,
    ];
  }

  it("the ticket voice never denies being a booking", () => {
    const text = allStrings(ALL_VOICES.ticket).join(" ");
    for (const d of DENIALS) {
      expect(text).not.toMatch(d);
    }
  });

  it("the plan voice never calls the document a ticket or a receipt", () => {
    const text = allStrings(ALL_VOICES.plan).join(" ");
    expect(text).not.toMatch(/\bticket\b(?!\s+number)/i);
    expect(text).not.toMatch(/\breceipt\b/i);
  });

  it("the plan voice states what it is not, so the denial is not silently dropped", () => {
    const text = allStrings(ALL_VOICES.plan).join(" ");
    expect(DENIALS.some((d) => d.test(text))).toBe(true);
  });

  it("no voice ships an empty string where copy is required", () => {
    for (const [name, v] of Object.entries(ALL_VOICES)) {
      for (const s of [v.title, v.issuedByLabel, v.documentNumberCaption, v.datedVerb]) {
        expect(s.trim(), `${name} has empty required copy`).not.toBe("");
      }
      expect(v.noticeLeft).toHaveLength(2);
      v.noticeLeft.forEach((p) => expect(p.trim()).not.toBe(""));
    }
  });

  it("exports the voice matching the selected posture", () => {
    expect(VOICE).toBe(ALL_VOICES[DOCUMENT_POSTURE]);
  });
});
