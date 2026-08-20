import { describe, expect, it } from "vitest";
import { deriveSegment, emptySegment, generatePnr, warningsFor, type Segment } from "@/lib/itinerary";

function seg(patch: Partial<Segment>): Segment {
  return { ...emptySegment(), ...patch };
}

describe("generatePnr", () => {
  it("is always 5 digits with no leading zero", () => {
    for (let i = 0; i < 500; i++) {
      const p = generatePnr();
      expect(p).toMatch(/^[1-9]\d{4}$/);
      expect(Number(p)).toBeGreaterThanOrEqual(10000);
      expect(Number(p)).toBeLessThanOrEqual(99999);
    }
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
