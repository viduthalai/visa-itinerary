import { describe, expect, it } from "vitest";
import {
  allLegsChosen,
  newItinerary,
  warningsFor,
  withReturnLeg,
  type Itinerary,
  type Segment,
} from "@/lib/itinerary";

function outbound(patch: Partial<Segment> = {}): Itinerary {
  const base = newItinerary();
  return {
    ...base,
    segments: [
      {
        ...base.segments[0],
        originIata: "BLR",
        destinationIata: "DXB",
        depart: { date: "2026-10-15", time: "17:30" },
        arrive: { date: "2026-10-15", time: "23:50" },
        airlineCode: "LH",
        flightNumber: "LH411",
        ...patch,
      },
    ],
  };
}

/** A round trip with the return leg's flight already chosen. */
function roundTripWithChosenReturn(): Itinerary {
  const it = withReturnLeg(outbound(), "2026-10-29");
  return {
    ...it,
    segments: [
      it.segments[0],
      {
        ...it.segments[1],
        depart: { date: "2026-10-29", time: "03:10" },
        arrive: { date: "2026-10-29", time: "08:25" },
        airlineCode: "EK",
        flightNumber: "EK568",
        arriveTerminal: "2",
      },
    ],
  };
}

describe("withReturnLeg", () => {
  it("reverses the outbound route", () => {
    const it = withReturnLeg(outbound(), "2026-10-29");
    expect(it.segments).toHaveLength(2);
    expect(it.segments[1].originIata).toBe("DXB");
    expect(it.segments[1].destinationIata).toBe("BLR");
    expect(it.segments[1].depart.date).toBe("2026-10-29");
  });

  it("never copies the outbound flight onto the return leg", () => {
    const it = withReturnLeg(outbound(), "2026-10-29");
    expect(it.segments[1].airlineCode).toBe("");
    expect(it.segments[1].flightNumber).toBe("");
    expect(it.segments[1].depart.time).toBe("");
  });

  it("removes the leg when the return date is cleared", () => {
    const round = withReturnLeg(outbound(), "2026-10-29");
    expect(withReturnLeg(round, "").segments).toHaveLength(1);
  });

  it("is idempotent — an unchanged call keeps the same object", () => {
    const round = roundTripWithChosenReturn();
    expect(withReturnLeg(round, "2026-10-29")).toBe(round);
  });

  it("preserves a chosen return flight when nothing relevant changed", () => {
    const round = roundTripWithChosenReturn();
    const again = withReturnLeg(round, "2026-10-29");
    expect(again.segments[1].flightNumber).toBe("EK568");
    expect(again.segments[1].arriveTerminal).toBe("2");
  });

  it("DISCARDS the chosen return flight when the return date changes", () => {
    const round = roundTripWithChosenReturn();
    const moved = withReturnLeg(round, "2026-11-02");
    expect(moved.segments[1].flightNumber).toBe("");
    expect(moved.segments[1].depart.time).toBe("");
    expect(moved.segments[1].depart.date).toBe("2026-11-02");
  });

  it("DISCARDS the chosen return flight when the outbound route changes", () => {
    const round = roundTripWithChosenReturn();
    // Outbound destination moves DXB -> LHR, so the return leg now starts at LHR.
    const rerouted: Itinerary = {
      ...round,
      segments: [{ ...round.segments[0], destinationIata: "LHR" }, round.segments[1]],
    };
    const synced = withReturnLeg(rerouted, "2026-10-29");
    expect(synced.segments[1].originIata).toBe("LHR");
    expect(synced.segments[1].flightNumber).toBe("");
  });

  it("keeps the return leg's id stable across a reset", () => {
    const round = roundTripWithChosenReturn();
    const moved = withReturnLeg(round, "2026-11-02");
    expect(moved.segments[1].id).toBe(round.segments[1].id);
  });
});

describe("allLegsChosen", () => {
  it("is false while the return leg has no flight", () => {
    expect(allLegsChosen(withReturnLeg(outbound(), "2026-10-29").segments)).toBe(false);
  });

  it("is true once both legs have one", () => {
    expect(allLegsChosen(roundTripWithChosenReturn().segments)).toBe(true);
  });

  it("is true for a one-way with a flight", () => {
    expect(allLegsChosen(outbound().segments)).toBe(true);
  });
});

describe("multi-leg warnings become reachable with a return leg", () => {
  it("flags a return that departs before the outbound lands", () => {
    const round = roundTripWithChosenReturn();
    const backwards: Itinerary = {
      ...round,
      segments: [
        round.segments[0],
        { ...round.segments[1], depart: { date: "2026-10-14", time: "06:00" } },
      ],
    };
    const texts = warningsFor(backwards.segments).map((w) => w.text);
    expect(texts.some((t) => /before the previous flight arrives/i.test(t))).toBe(true);
  });

  it("does not flag a correctly ordered round trip", () => {
    expect(warningsFor(roundTripWithChosenReturn().segments)).toEqual([]);
  });
});
