import { describe, expect, it } from "vitest";
import {
  deriveSegment,
  emptySegment,
  formatPassenger,
  emptyFare,
  generatePnr,
  hasFare,
  type Passenger,
  passengerWarnings,
  warningsFor,
  type Segment,
} from "@/lib/itinerary";

function seg(patch: Partial<Segment>): Segment {
  return { ...emptySegment(), ...patch };
}

describe("generatePnr", () => {
  it("is always 6 uppercase alphanumeric characters", () => {
    for (let i = 0; i < 500; i++) {
      expect(generatePnr()).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it("never contains I or O — unreadable against 1 and 0 in print", () => {
    for (let i = 0; i < 500; i++) {
      expect(generatePnr()).not.toMatch(/[IO]/);
    }
  });

  it("always contains at least two letters, so it reads as a locator", () => {
    for (let i = 0; i < 500; i++) {
      const letters = generatePnr().replace(/[^A-Z]/g, "");
      expect(letters.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("produces varied values rather than a constant", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePnr()));
    expect(seen.size).toBeGreaterThan(150);
  });
});

describe("formatPassenger", () => {
  it("prints title, given names, surname, uppercased", () => {
    expect(
      formatPassenger({ id: "p1", title: "Mr", givenNames: "John", surname: "Smith" }),
    ).toBe("MR JOHN SMITH");
  });

  it("skips missing parts without leaving double spaces", () => {
    expect(formatPassenger({ id: "p1", title: "", givenNames: "Ada", surname: "Lovelace" })).toBe(
      "ADA LOVELACE",
    );
    expect(formatPassenger({ id: "p1", title: "DR", givenNames: "", surname: "Who" })).toBe(
      "DR WHO",
    );
  });

  it("is empty when nothing is entered", () => {
    expect(formatPassenger({ id: "p1", title: "", givenNames: "", surname: "" })).toBe("");
  });
});

describe("passengerWarnings", () => {
  const pax = (patch: Partial<Passenger>): Passenger => ({
    id: "p",
    title: "",
    givenNames: "",
    surname: "",
    ...patch,
  });

  it("flags an entirely empty passenger list", () => {
    expect(passengerWarnings([pax({})]).map((w) => w.text)).toContain(
      "No passenger name entered.",
    );
  });

  it("is silent on a complete passenger", () => {
    expect(passengerWarnings([pax({ givenNames: "John", surname: "Smith" })])).toEqual([]);
  });

  it("flags a missing surname but not an empty row", () => {
    const w = passengerWarnings([pax({ givenNames: "John" })]).map((x) => x.text);
    expect(w).toContain("Passenger 1 has no surname.");
    expect(w).not.toContain("No passenger name entered.");
  });

  it("flags missing given names", () => {
    expect(passengerWarnings([pax({ surname: "Smith" })]).map((x) => x.text)).toContain(
      "Passenger 1 has no given names.",
    );
  });

  it("flags two passengers with the same name", () => {
    const w = passengerWarnings([
      pax({ id: "a", givenNames: "John", surname: "Smith" }),
      pax({ id: "b", givenNames: "John", surname: "Smith" }),
    ]).map((x) => x.text);
    expect(w).toContain("Two passengers have the same name (JOHN SMITH).");
  });

  it("ignores title when comparing — MR JOHN SMITH is the same person as JOHN SMITH", () => {
    const w = passengerWarnings([
      pax({ id: "a", title: "MR", givenNames: "John", surname: "Smith" }),
      pax({ id: "b", title: "", givenNames: "John", surname: "Smith" }),
    ]).map((x) => x.text);
    expect(w).toContain("Two passengers have the same name (JOHN SMITH).");
  });

  it("ignores case and surrounding whitespace when comparing", () => {
    const w = passengerWarnings([
      pax({ id: "a", givenNames: "john", surname: "smith" }),
      pax({ id: "b", givenNames: " John ", surname: "SMITH" }),
    ]).map((x) => x.text);
    expect(w).toContain("Two passengers have the same name (JOHN SMITH).");
  });

  it("does not flag two different passengers", () => {
    expect(
      passengerWarnings([
        pax({ id: "a", givenNames: "John", surname: "Smith" }),
        pax({ id: "b", givenNames: "Jane", surname: "Smith" }),
      ]),
    ).toEqual([]);
  });
});

describe("deriveSegment", () => {
  it("calculates duration across zones once both airports are set", () => {
    const d = deriveSegment(
      seg({
        originIata: "JFK",
        destinationIata: "MUC",
        depart: { date: "2026-10-15", time: "17:30" },
        arrive: { date: "2026-10-16", time: "07:20" },
      }),
    );
    expect(d.durationMinutes).toBe(470);
    expect(d.nextDay).toBe(true);
    expect(d.originTz).toBe("America/New_York");
    expect(d.destinationTz).toBe("Europe/Berlin");
  });

  it("returns null duration while the form is incomplete", () => {
    expect(deriveSegment(emptySegment()).durationMinutes).toBeNull();
    expect(deriveSegment(seg({ originIata: "JFK" })).durationMinutes).toBeNull();
  });
});

describe("warningsFor", () => {
  // NOTE: fixtures must be reasoned about in real elapsed time, not clock time.
  // JFK 10:00 -> LHR 14:00 *looks* fine but JFK is GMT-4 and LHR GMT+1, so it
  // arrives 1h before it departs. Two of these fixtures were originally wrong
  // for exactly that reason — the bug this module exists to catch.
  const base = {
    depart: { date: "2026-10-15", time: "10:00" },
    arrive: { date: "2026-10-15", time: "22:00" }, // JFK 10:00 EDT -> LHR 22:00 BST = 7h
  };

  it("is silent on a sane single leg", () => {
    expect(
      warningsFor([seg({ ...base, originIata: "JFK", destinationIata: "LHR" })]),
    ).toEqual([]);
  });

  it("is silent on a westbound leg that lands at an earlier clock time", () => {
    // JFK 18:00 EDT -> LAX 20:00 PDT is 5h elapsed even though the clock only
    // advances 2h. A naive comparison would wrongly flag this.
    expect(
      warningsFor([
        seg({
          originIata: "JFK",
          destinationIata: "LAX",
          depart: { date: "2026-10-15", time: "18:00" },
          arrive: { date: "2026-10-15", time: "20:00" },
        }),
      ]),
    ).toEqual([]);
  });

  it("flags a leg that arrives before it departs", () => {
    // Same zone, so the intent is unambiguous.
    const w = warningsFor([
      seg({
        originIata: "JFK",
        destinationIata: "BOS",
        depart: { date: "2026-10-15", time: "18:00" },
        arrive: { date: "2026-10-15", time: "17:00" },
      }),
    ]);
    expect(w.map((x) => x.text)).toContain("Arrives before it departs.");
  });

  it("flags a disconnected journey", () => {
    const w = warningsFor([
      seg({ ...base, originIata: "JFK", destinationIata: "LHR" }),
      seg({
        originIata: "CDG",
        destinationIata: "JFK",
        depart: { date: "2026-10-20", time: "10:00" },
        arrive: { date: "2026-10-20", time: "13:00" },
      }),
    ]);
    expect(w.some((x) => x.text.includes("previous flight landed at LHR"))).toBe(true);
  });

  it("flags identical origin and destination", () => {
    const w = warningsFor([seg({ ...base, originIata: "JFK", destinationIata: "JFK" })]);
    expect(w.map((x) => x.text)).toContain("Origin and destination are the same airport.");
  });

  it("flags a leg departing before the previous one lands", () => {
    const w = warningsFor([
      seg({
        originIata: "JFK",
        destinationIata: "LHR",
        depart: { date: "2026-10-15", time: "10:00" },
        arrive: { date: "2026-10-16", time: "06:00" },
      }),
      seg({
        originIata: "LHR",
        destinationIata: "MUC",
        depart: { date: "2026-10-15", time: "20:00" },
        arrive: { date: "2026-10-15", time: "22:00" },
      }),
    ]);
    expect(w.some((x) => x.text === "Departs before the previous flight arrives.")).toBe(true);
  });

  it("says nothing while the form is still empty", () => {
    expect(warningsFor([emptySegment()])).toEqual([]);
  });
});

describe("hasFare", () => {
  it("is false for a blank fare, so the block stays off the document", () => {
    expect(hasFare(emptyFare())).toBe(false);
  });

  it("is false when fields contain only whitespace", () => {
    expect(hasFare({ ...emptyFare(), base: "   ", total: "\n" })).toBe(false);
  });

  it("is true as soon as any single field has content", () => {
    expect(hasFare({ ...emptyFare(), formOfPayment: "CREDIT CARD" })).toBe(true);
    expect(hasFare({ ...emptyFare(), calculation: "BLR EK X/DXB" })).toBe(true);
  });
});
